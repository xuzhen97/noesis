import { describe, expect, it } from "vitest";
import {
  createNoesisError,
  protocolVersion,
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
});
