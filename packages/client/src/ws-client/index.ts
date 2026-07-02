import WebSocket from "ws";
import type {
	ClientToGatewayMessage,
	CommandRunPayload,
	GatewayToClientMessage,
	TaskEvent,
	TaskStatus,
} from "@noesis/shared";
import { executeCommandRunTask } from "../command-executor/index.js";

/** Client Agent WebSocket 连接形状（用于注入 / 测试） */
export interface ClientWsShape {
	gatewayUrl: string;
}

/** Client Agent 启动选项 */
export interface ClientAgentOptions {
	/** Gateway HTTP URL */
	gatewayUrl: string;
	/** 唯一 Machine 标识 */
	machineId: string;
}

/** Client Agent 连接句柄 */
export interface ClientAgentConnection {
	/** 断开 WebSocket 连接 */
	close(): void;
}

function toWsUrl(gatewayUrl: string): string {
	let url: URL;
	try {
		url = new URL(gatewayUrl);
	} catch {
		throw new Error("Invalid gateway URL");
	}
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	url.pathname = "/ws/client";
	return url.toString();
}

function makeEvent(
	taskId: string,
	type: string,
	status: TaskStatus | undefined,
	data: Record<string, unknown>,
): ClientToGatewayMessage {
	const taskEvent: TaskEvent = {
		id: `event_${Date.now()}_${Math.random().toString(16).slice(2)}`,
		taskId,
		type,
		level: status === "failed" ? "error" : "info",
		data,
	};
	return { type: "task.event", taskId, taskStatus: status, event: taskEvent };
}

/**
 * 启动 Client Agent：通过 WebSocket 连接到 Gateway，注册 hello，等待 task.dispatch 消息并执行命令。
 */
export async function startClientAgent(
	options: ClientAgentOptions,
): Promise<ClientAgentConnection> {
	const ws = new WebSocket(toWsUrl(options.gatewayUrl));
	await new Promise<void>((resolve, reject) => {
		ws.once("open", () => {
			ws.send(
				JSON.stringify({
					type: "client.hello",
					machineId: options.machineId,
				} satisfies ClientToGatewayMessage),
			);
			resolve();
		});
		ws.once("error", reject);
	});

	ws.on("message", (raw) => {
		void (async () => {
			let message: GatewayToClientMessage;
			try {
				message = JSON.parse(String(raw)) as GatewayToClientMessage;
			} catch {
				return;
			}
			if (message.type !== "task.dispatch") return;

			ws.send(
				JSON.stringify(
					makeEvent(message.task.id, "task.running", "running", {}),
				),
			);

			try {
				const result = await executeCommandRunTask(
					message.task.payload as unknown as CommandRunPayload,
				);
				ws.send(
					JSON.stringify(
						makeEvent(
							message.task.id,
							"task.succeeded",
							result.exitCode === 0 ? "succeeded" : "failed",
							result as unknown as Record<string, unknown>,
						),
					),
				);
			} catch (error: unknown) {
				const safe =
					typeof error === "object" && error !== null
						? (error as { code?: unknown; message?: unknown })
						: {};
				ws.send(
					JSON.stringify(
						makeEvent(message.task.id, "task.failed", "failed", {
							code:
								typeof safe.code === "string"
									? safe.code
									: "NOESIS_UNAVAILABLE",
							message:
								typeof safe.message === "string"
									? safe.message
									: "Command execution failed",
						}),
					),
				);
			}
		})();
	});

	return { close: () => ws.close() };
}

/** 创建 ClientWsShape（用于测试注入） */
export function createClientWsShape(gatewayUrl: string): ClientWsShape {
	return { gatewayUrl };
}
