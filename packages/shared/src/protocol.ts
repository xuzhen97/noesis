export const protocolVersion = "0.1.0" as const;

export type MachineStatus = "online" | "offline" | "disabled";

export interface Machine {
  id: string;
  name: string;
  status: MachineStatus;
  lastSeenAt?: string;
}

export type TaskType = "command.run";

export type TaskStatus =
  | "created"
  | "queued"
  | "waiting_client"
  | "dispatched"
  | "running"
  | "succeeded"
  | "failed"
  | "canceling"
  | "canceled"
  | "timeout";

export interface Task {
  id: string;
  machineId?: string;
  taskType: TaskType;
  status: TaskStatus;
  payload: Record<string, unknown>;
}

export type TaskEventLevel = "debug" | "info" | "warn" | "error";

export interface TaskEvent {
  id: string;
  taskId: string;
  type: string;
  level: TaskEventLevel;
  data: Record<string, unknown>;
}

export interface CommandRunPayload {
  command: ["node", "-e", "console.log('noesis-ok')"];
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface ClientHelloMessage {
  type: "client.hello";
  machineId: string;
}

export interface TaskEventMessage {
  type: "task.event";
  taskId: string;
  taskStatus?: TaskStatus;
  event: TaskEvent;
}

export type ClientToGatewayMessage = ClientHelloMessage | TaskEventMessage;

export interface TaskDispatchMessage {
  type: "task.dispatch";
  task: Task;
}

export interface ClientAcceptedMessage {
  type: "client.accepted";
  machineId: string;
}

export type GatewayToClientMessage = TaskDispatchMessage | ClientAcceptedMessage;

export interface GatewayHealth {
  ok: true;
  service: "gateway";
  protocolVersion: typeof protocolVersion;
}
