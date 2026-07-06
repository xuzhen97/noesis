import type {
	ClientToGatewayMessage,
	CommandRunPayload,
	GatewayToClientMessage,
	TaskEvent,
	TaskStatus,
} from "@noesis/shared";
import { executeCommandRunTask } from "../command-executor/index.js";
import {
	executeFileListTask,
	executeFileReadTask,
	executeFileWriteTask,
} from "../file-handler.js";
import { downloadAliyunTransfer } from "../transfer-download.js";
import { uploadExportTransfer } from "../transfer-upload.js";

export type ClientMessageDispatchOptions = {
	gatewayUrl: string;
	machineId: string;
	ownerToken: string;
};

type ClientSender = {
	send(data: string): void;
};

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

async function postTransferEvent(
	options: ClientMessageDispatchOptions,
	transferId: string,
	suffix: string,
	payload: Record<string, unknown>,
): Promise<void> {
	await fetch(
		`${options.gatewayUrl}/api/transfers/${encodeURIComponent(transferId)}/${suffix}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${options.ownerToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		},
	);
}

async function handleTransferUploadStart(
	message: Extract<GatewayToClientMessage, { type: "transfer.upload.start" }>,
	options: ClientMessageDispatchOptions,
): Promise<void> {
	const transferId = message.payload.transferId;
	try {
		const detailRes = await fetch(
			`${options.gatewayUrl}/api/transfers/${encodeURIComponent(transferId)}`,
			{ headers: { Authorization: `Bearer ${options.ownerToken}` } },
		);
		const detailBody = (await detailRes.json()) as {
			ok: boolean;
			data: { targetDir: string; filename: string };
		};
		const rel =
			detailBody.data.targetDir === "."
				? detailBody.data.filename
				: `${detailBody.data.targetDir.replace(/\\/g, "/")}/${detailBody.data.filename}`;
		await uploadExportTransfer({
			apiBaseUrl: options.gatewayUrl,
			ownerToken: options.ownerToken,
			transferId,
			machineId: options.machineId,
			localPath: rel.replace(/^\//, ""),
		});
	} catch {
		// uploadExportTransfer reports failure
	}
}

async function handleTransferDownloadStart(
	message: Extract<GatewayToClientMessage, { type: "transfer.download.start" }>,
	options: ClientMessageDispatchOptions,
): Promise<void> {
	const transferId = message.payload.transferId;
	try {
		await downloadAliyunTransfer({
			transferId,
			machineId: options.machineId,
			apiBaseUrl: options.gatewayUrl,
			ownerToken: options.ownerToken,
			reportProgress: (p) =>
				postTransferEvent(options, transferId, "client-progress", p),
			reportComplete: (p) =>
				postTransferEvent(options, transferId, "client-complete", p),
			reportFailed: (p) =>
				postTransferEvent(options, transferId, "client-failed", p),
		});
	} catch {
		// reportFailed already sent
	}
}

async function handleTaskDispatch(
	message: Extract<GatewayToClientMessage, { type: "task.dispatch" }>,
	ws: ClientSender,
): Promise<void> {
	ws.send(
		JSON.stringify(makeEvent(message.task.id, "task.running", "running", {})),
	);

	try {
		const payload = message.task.payload;
		let result: Record<string, unknown>;
		if (message.task.taskType === "command.run") {
			const cmd = await executeCommandRunTask(
				payload as unknown as CommandRunPayload,
			);
			result = cmd as unknown as Record<string, unknown>;
			ws.send(
				JSON.stringify(
					makeEvent(
						message.task.id,
						cmd.exitCode === 0 ? "task.succeeded" : "task.failed",
						cmd.exitCode === 0 ? "succeeded" : "failed",
						result,
					),
				),
			);
			return;
		}
		if (message.task.taskType === "file.list") {
			result = await executeFileListTask(
				payload as { path: string; allowedPaths?: string[] },
			);
		} else if (message.task.taskType === "file.read") {
			result = await executeFileReadTask(
				payload as {
					path: string;
					encoding?: "utf8" | "base64";
					allowedPaths?: string[];
				},
			);
		} else if (message.task.taskType === "file.write") {
			result = await executeFileWriteTask(
				payload as {
					path: string;
					content: string;
					encoding?: "utf8" | "base64";
					allowedPaths?: string[];
				},
			);
		} else {
			throw new Error("UNSUPPORTED_TASK_TYPE");
		}
		ws.send(
			JSON.stringify(
				makeEvent(message.task.id, "task.succeeded", "succeeded", result),
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
						typeof safe.code === "string" ? safe.code : "NOESIS_UNAVAILABLE",
					message:
						typeof safe.message === "string"
							? safe.message
							: "Command execution failed",
				}),
			),
		);
	}
}

/** 创建 Gateway 消息处理器。 */
export function createGatewayMessageHandler(
	options: ClientMessageDispatchOptions,
	ws: ClientSender,
) {
	return (raw: unknown) => {
		void (async () => {
			let message: GatewayToClientMessage;
			try {
				message = JSON.parse(String(raw)) as GatewayToClientMessage;
			} catch {
				return;
			}
			if (message.type === "transfer.upload.start") {
				await handleTransferUploadStart(message, options);
				return;
			}
			if (message.type === "transfer.download.start") {
				await handleTransferDownloadStart(message, options);
				return;
			}
			if (message.type === "task.dispatch") {
				await handleTaskDispatch(message, ws);
			}
		})();
	};
}
