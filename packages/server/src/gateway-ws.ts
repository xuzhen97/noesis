import type { Server } from "node:http";
import type Database from "better-sqlite3";
import { WebSocketServer, type WebSocket } from "ws";
import type {
	ClientToGatewayMessage,
	GatewayToClientMessage,
	Machine,
	Task,
} from "@noesis/shared";
import { readBearerToken, ownerTokenEquals } from "./auth.js";
import {
	getTaskRow,
	insertTaskEvent,
	listTaskIdsWaitingClient,
	setMachineOffline,
	updateTaskResult,
	updateTaskStatus,
	upsertMachineOnline,
} from "./gateway-store.js";

export interface GatewayWsState {
	machines: Map<string, Machine>;
	clients: Map<string, WebSocket>;
}

export function attachGatewayWebSocket(options: {
	server: Server;
	db: Database.Database;
	ownerToken: string;
	gatewayState: GatewayWsState;
	dispatchTask: (task: Task) => void;
}): WebSocketServer {
	const { server, db, ownerToken, gatewayState, dispatchTask } = options;
	const wss = new WebSocketServer({ noServer: true });

	server.on("upgrade", (request, socket, head) => {
		const url = new URL(request.url ?? "/", "http://127.0.0.1");
		if (url.pathname !== "/ws/client") {
			socket.destroy();
			return;
		}
		const bearer = readBearerToken(request.headers.authorization);
		if (bearer === null || !ownerTokenEquals(ownerToken, bearer)) {
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
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
			try {
				message = JSON.parse(String(raw)) as ClientToGatewayMessage;
			} catch {
				return;
			}
			if (message.type === "client.hello") {
				machineId = message.machineId;
				const lastSeenAt = new Date().toISOString();
				const machine: Machine = {
					id: machineId,
					name: machineId,
					status: "online",
					lastSeenAt,
					disks: message.disks,
				};
				gatewayState.machines.set(machineId, machine);
				upsertMachineOnline(db, machine);
				gatewayState.clients.set(machineId, ws);
				ws.send(
					JSON.stringify({
						type: "client.accepted",
						machineId,
					} satisfies GatewayToClientMessage),
				);
				for (const taskId of listTaskIdsWaitingClient(db, machineId)) {
					const task = getTaskRow(db, taskId);
					if (task) dispatchTask(task);
				}
				return;
			}
			if (message.type === "task.event") {
				insertTaskEvent(db, message.event);
				if (message.taskStatus) {
					if (
						message.taskStatus === "succeeded" ||
						message.taskStatus === "failed"
					) {
						const data = message.event.data;
						const code = typeof data.code === "string" ? data.code : undefined;
						const msg =
							typeof data.message === "string" ? data.message : undefined;
						updateTaskResult(
							db,
							message.taskId,
							message.taskStatus,
							data,
							code,
							msg,
						);
					} else {
						updateTaskStatus(db, message.taskId, message.taskStatus);
					}
				}
			}
		});

		ws.on("close", () => {
			if (!machineId) return;
			gatewayState.clients.delete(machineId);
			const lastSeenAt = new Date().toISOString();
			const machine = gatewayState.machines.get(machineId);
			if (machine) {
				gatewayState.machines.set(machineId, {
					...machine,
					status: "offline",
					lastSeenAt,
				});
			}
			setMachineOffline(db, machineId, lastSeenAt);
		});
	});

	return wss;
}
