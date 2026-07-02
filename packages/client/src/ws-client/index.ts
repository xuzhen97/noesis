import WebSocket from "ws";
import type {
	ClientToGatewayMessage,
	CommandRunPayload,
	GatewayToClientMessage,
	TaskEvent,
	TaskStatus,
} from "@noesis/shared";
import { executeCommandRunTask } from "../command-executor/index.js";

export interface ClientWsShape {
	gatewayUrl: string;
}

export interface ClientAgentOptions {
	gatewayUrl: string;
	machineId: string;
}

export interface ClientAgentConnection {
	close(): void;
}

function toWsUrl(gatewayUrl: string): string {
	const url = new URL(gatewayUrl);
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

export function createClientWsShape(gatewayUrl: string): ClientWsShape {
	return { gatewayUrl };
}
