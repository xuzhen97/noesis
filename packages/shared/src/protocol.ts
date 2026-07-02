/** 当前协议版本号 */
export const protocolVersion = "0.1.0" as const;

/** Machine 连接状态：在线 / 离线 / 已禁用 */
export type MachineStatus = "online" | "offline" | "disabled";

/** 注册到 Gateway 的 Machine，代表一个可执行任务的计算节点 */
export interface Machine {
  id: string;
  name: string;
  status: MachineStatus;
  lastSeenAt?: string;
}

/** 当前支持的任务类型 */
export type TaskType = "command.run";

/** Task 生命周期状态 */
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

/** 一个可派发的任务实例 */
export interface Task {
  id: string;
  machineId?: string;
  taskType: TaskType;
  status: TaskStatus;
  payload: Record<string, unknown>;
}

/** 任务事件级别 */
export type TaskEventLevel = "debug" | "info" | "warn" | "error";

/** 任务执行过程中的事件记录，作为审计证据（只追加，不删除） */
export interface TaskEvent {
  id: string;
  taskId: string;
  type: string;
  level: TaskEventLevel;
  data: Record<string, unknown>;
}

/** command.run 任务类型的负载：Distribution 阶段仅允许白名单命令 */
export interface CommandRunPayload {
  command: ["node", "-e", "console.log('noesis-ok')"];
}

/** API 成功响应 */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
}

/** API 失败响应，包含稳定 code 和安全 message */
export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}

/** 统一 API 响应类型：成功或失败 */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Client Agent → Gateway：注册 hello 消息 */
export interface ClientHelloMessage {
  type: "client.hello";
  machineId: string;
}

/** Client Agent → Gateway：任务事件报告 */
export interface TaskEventMessage {
  type: "task.event";
  taskId: string;
  taskStatus?: TaskStatus;
  event: TaskEvent;
}

/** Client Agent 发送给 Gateway 的所有消息类型 */
export type ClientToGatewayMessage = ClientHelloMessage | TaskEventMessage;

/** Gateway → Client Agent：派发任务 */
export interface TaskDispatchMessage {
  type: "task.dispatch";
  task: Task;
}

/** Gateway → Client Agent：接受注册确认 */
export interface ClientAcceptedMessage {
  type: "client.accepted";
  machineId: string;
}

/** Gateway 发送给 Client Agent 的所有消息类型 */
export type GatewayToClientMessage = TaskDispatchMessage | ClientAcceptedMessage;

/** /api/health 健康检查响应 */
export interface GatewayHealth {
  ok: true;
  service: "gateway";
  protocolVersion: typeof protocolVersion;
}
