import WebSocket from "ws";
import type {
	ClientToGatewayMessage,
	GatewayToClientMessage,
} from "@noesis/shared";
import { defaultDisks } from "../file-handler.js";
import { createGatewayMessageHandler } from "./message-dispatch.js";

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
	/** Owner Token：Gateway 认证凭证 */
	ownerToken: string;
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

/**
 * 启动 Client Agent：通过 WebSocket 连接到 Gateway，注册 hello，等待 client.accepted 后再开始处理任务派发。
 */
export async function startClientAgent(
	options: ClientAgentOptions,
): Promise<ClientAgentConnection> {
	const ws = new WebSocket(toWsUrl(options.gatewayUrl), {
		headers: { Authorization: `Bearer ${options.ownerToken}` },
	});

	await new Promise<void>((resolve, reject) => {
		ws.once("open", () => {
			ws.send(
				JSON.stringify({
					type: "client.hello",
					machineId: options.machineId,
					disks: defaultDisks(),
				} satisfies ClientToGatewayMessage),
			);
			resolve();
		});
		ws.once("error", reject);
	});

	// 等 client.accepted
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error("Client Agent not accepted within 5s")),
			5000,
		);
		ws.on("message", (raw) => {
			try {
				const msg = JSON.parse(String(raw)) as GatewayToClientMessage;
				if (msg.type === "client.accepted") {
					clearTimeout(timer);
					resolve();
				}
			} catch {
				// 忽略非 JSON 消息
			}
		});
	});

	// client.accepted 之后，切换为任务派发处理
	ws.removeAllListeners("message");
	ws.on("message", createGatewayMessageHandler(options, ws));

	return { close: () => ws.close() };
}

/** 创建 ClientWsShape（用于测试注入） */
export function createClientWsShape(gatewayUrl: string): ClientWsShape {
	return { gatewayUrl };
}
