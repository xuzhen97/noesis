import { describe, expect, it } from "vitest";
import {
  createNoesisError,
  protocolVersion,
  type ApiResponse,
  type ClientToGatewayMessage,
  type CommandRunPayload,
  type GatewayToClientMessage,
  type Machine,
  type Task,
  type TaskEvent,
} from "./index.js";

describe("shared protocol foundation", () => {
  it("exports the P0 protocol vocabulary", () => {
    const machine: Machine = {
      id: "machine_1",
      name: "本机",
      status: "online",
    };

    const task: Task = {
      id: "task_1",
      machineId: machine.id,
      taskType: "command.run",
      status: "created",
      payload: { command: "node -v" },
    };

    const event: TaskEvent = {
      id: "event_1",
      taskId: task.id,
      type: "task.created",
      level: "info",
      data: { protocolVersion },
    };

    expect(protocolVersion).toBe("0.1.0");
    expect(event.taskId).toBe("task_1");
    expect(createNoesisError("UNSUPPORTED_TASK_TYPE", "不支持的 Task 类型")).toEqual({
      code: "UNSUPPORTED_TASK_TYPE",
      message: "不支持的 Task 类型",
    });
  });

  it("describes the distribution command and Gateway/Client Agent messages", () => {
    const payload: CommandRunPayload = {
      command: ["node", "-e", "console.log('noesis-ok')"],
    };

    const dispatchTask: Task = {
      id: "task_1",
      machineId: "local-dev-machine",
      taskType: "command.run",
      status: "dispatched",
      payload: payload as unknown as Record<string, unknown>,
    };

    const dispatch: GatewayToClientMessage = {
      type: "task.dispatch",
      task: dispatchTask,
    };
    void dispatch;

    const event: ClientToGatewayMessage = {
      type: "task.event",
      taskId: "task_1",
      taskStatus: "succeeded",
      event: {
        id: "event_1",
        taskId: "task_1",
        type: "task.succeeded",
        level: "info",
        data: { stdout: "noesis-ok\n", stderr: "", exitCode: 0 },
      },
    };

    const response: ApiResponse<Task> = {
      ok: true,
      requestId: "req_1",
      data: dispatchTask,
    };

    expect(payload.command).toEqual(["node", "-e", "console.log('noesis-ok')"]);
    expect(dispatchTask.payload).toEqual(payload);
    expect(event.taskStatus).toBe("succeeded");
    expect(response.ok).toBe(true);
  });
});
