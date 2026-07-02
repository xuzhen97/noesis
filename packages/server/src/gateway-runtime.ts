import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import {
  createNoesisError,
  protocolVersion,
  type ApiResponse,
  type ClientToGatewayMessage,
  type GatewayToClientMessage,
  type GatewayHealth,
  type Machine,
  type Task,
  type TaskEvent,
  type TaskStatus,
  type TaskType,
} from "@noesis/shared";

export interface GatewayRuntimeOptions {
  port: number;
}

export interface GatewayRuntime {
  httpUrl: string;
  wsUrl: string;
  port: number;
  close(): Promise<void>;
}

interface GatewayState {
  machines: Map<string, Machine>;
  clients: Map<string, WebSocket>;
  tasks: Map<string, Task>;
  events: Map<string, TaskEvent[]>;
}

function state(): GatewayState {
  return {
    machines: new Map(),
    clients: new Map(),
    tasks: new Map(),
    events: new Map(),
  };
}

function json<T>(
  response: ServerResponse,
  statusCode: number,
  body: ApiResponse<T>,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data, requestId: randomUUID() };
}

function fail(
  code: Parameters<typeof createNoesisError>[0],
  message: string,
): ApiResponse<never> {
  return {
    ok: false,
    error: createNoesisError(code, message),
    requestId: randomUUID(),
  };
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(text) as unknown; } catch { throw createNoesisError("BAD_REQUEST", "Invalid JSON body"); }
}

function appendEvent(
  gatewayState: GatewayState,
  event: TaskEvent,
): void {
  const existing = gatewayState.events.get(event.taskId) ?? [];
  existing.push(event);
  gatewayState.events.set(event.taskId, existing);
}

function setTaskStatus(
  gatewayState: GatewayState,
  taskId: string,
  status: TaskStatus,
): void {
  const task = gatewayState.tasks.get(taskId);
  if (task) gatewayState.tasks.set(taskId, { ...task, status });
}

function dispatchIfPossible(
  gatewayState: GatewayState,
  task: Task,
): void {
  const client =
    task.machineId === undefined
      ? undefined
      : gatewayState.clients.get(task.machineId);
  if (!client || client.readyState !== client.OPEN) {
    setTaskStatus(gatewayState, task.id, "waiting_client");
    return;
  }
  setTaskStatus(gatewayState, task.id, "dispatched");
  appendEvent(gatewayState, {
    id: `event_${randomUUID()}`,
    taskId: task.id,
    type: "task.dispatched",
    level: "info",
    data: { machineId: task.machineId },
  });
  const dispatched = gatewayState.tasks.get(task.id) ?? task;
  client.send(
    JSON.stringify({
      type: "task.dispatch",
      task: dispatched,
    } satisfies GatewayToClientMessage),
  );
}

function isCommandRunRequest(
  value: unknown,
): value is {
  machineId: string;
  taskType: TaskType;
  payload: Record<string, unknown>;
} {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.machineId === "string" &&
    record.taskType === "command.run" &&
    typeof record.payload === "object" &&
    record.payload !== null
  );
}

export async function startGateway(
  options: GatewayRuntimeOptions,
): Promise<GatewayRuntime> {
  const gatewayState = state();

  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (request.method === "GET" && url.pathname === "/api/health") {
        json<GatewayHealth>(response, 200, ok({
          ok: true,
          service: "gateway",
          protocolVersion,
        }));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/tasks") {
        const body = await readBody(request);
        if (!isCommandRunRequest(body)) {
          json(response, 400, fail("BAD_REQUEST", "Invalid command.run task request"));
          return;
        }
        const task: Task = {
          id: `task_${randomUUID()}`,
          machineId: body.machineId,
          taskType: "command.run",
          status: "created",
          payload: body.payload,
        };
        gatewayState.tasks.set(task.id, task);
        gatewayState.events.set(task.id, []);
        appendEvent(gatewayState, {
          id: `event_${randomUUID()}`,
          taskId: task.id,
          type: "task.created",
          level: "info",
          data: {},
        });
        setTaskStatus(gatewayState, task.id, "queued");
        dispatchIfPossible(
          gatewayState,
          gatewayState.tasks.get(task.id) ?? task,
        );
        json(response, 201, ok(gatewayState.tasks.get(task.id) ?? task));
        return;
      }

      const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (request.method === "GET" && taskMatch) {
        const found = gatewayState.tasks.get(taskMatch[1]);
        json(
          response,
          found ? 200 : 404,
          found ? ok(found) : fail("TASK_NOT_FOUND", "Task not found"),
        );
        return;
      }

      const eventsMatch = url.pathname.match(
        /^\/api\/tasks\/([^/]+)\/events$/,
      );
      if (request.method === "GET" && eventsMatch) {
        const found = gatewayState.events.get(eventsMatch[1]);
        json(
          response,
          found ? 200 : 404,
          found
            ? ok(found)
            : fail("TASK_NOT_FOUND", "Task not found"),
        );
        return;
      }

      json(response, 404, fail("BAD_REQUEST", "Route not found"));
    },
  );

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/ws/client") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) =>
      wss.emit("connection", ws, request),
    );
  });

  wss.on("connection", (ws) => {
    let machineId: string | undefined;

    ws.on("message", (raw) => {
      let message: ClientToGatewayMessage;
      try { message = JSON.parse(String(raw)) as ClientToGatewayMessage; } catch { return; }
      if (message.type === "client.hello") {
        machineId = message.machineId;
        gatewayState.machines.set(machineId, {
          id: machineId,
          name: machineId,
          status: "online",
          lastSeenAt: new Date().toISOString(),
        });
        gatewayState.clients.set(machineId, ws);
        ws.send(
          JSON.stringify({
            type: "client.accepted",
            machineId,
          } satisfies GatewayToClientMessage),
        );
        for (const task of gatewayState.tasks.values()) {
          if (
            task.machineId === machineId &&
            task.status === "waiting_client"
          ) {
            dispatchIfPossible(gatewayState, task);
          }
        }
        return;
      }
      if (message.type === "task.event") {
        appendEvent(gatewayState, message.event);
        if (message.taskStatus) {
          setTaskStatus(gatewayState, message.taskId, message.taskStatus);
        }
      }
    });

    ws.on("close", () => {
      if (!machineId) return;
      gatewayState.clients.delete(machineId);
      const machine = gatewayState.machines.get(machineId);
      if (machine) {
        gatewayState.machines.set(machineId, {
          ...machine,
          status: "offline",
          lastSeenAt: new Date().toISOString(),
        });
      }
    });
  });

  await new Promise<void>((resolve) =>
    server.listen(options.port, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("Gateway did not bind a TCP port");
  }
  const port = address.port;

  return {
    port,
    httpUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}`,
    close: async () => {
      for (const client of gatewayState.clients.values()) client.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      wss.close();
    },
  };
}
