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

export interface GatewayHealth {
  ok: true;
  service: "gateway";
  protocolVersion: typeof protocolVersion;
}
