import type { Database } from "better-sqlite3";
import type { Task, TaskStatus, TaskType } from "@noesis/shared";
import {
	ensureMachineRow,
	getTaskRow,
	insertTask,
	insertTaskEvent,
	updateTaskStatus,
} from "./gateway-store.js";
import { randomUUID } from "node:crypto";

const TERMINAL: TaskStatus[] = ["succeeded", "failed", "canceled", "timeout"];

export type FileTaskKind = "file.list" | "file.read" | "file.write";

export function createFileTask(
	db: Database,
	input: {
		machineId: string;
		taskType: FileTaskKind;
		payload: Record<string, unknown>;
	},
): Task {
	ensureMachineRow(db, input.machineId);
	const task: Task = {
		id: `task_${randomUUID()}`,
		machineId: input.machineId,
		taskType: input.taskType as TaskType,
		status: "created",
		payload: input.payload,
	};
	insertTask(db, task);
	insertTaskEvent(db, {
		id: `event_${randomUUID()}`,
		taskId: task.id,
		type: "task.created",
		level: "info",
		data: {},
	});
	updateTaskStatus(db, task.id, "queued");
	return getTaskRow(db, task.id) ?? task;
}

export async function waitForTaskTerminal(
	db: Database,
	taskId: string,
	timeoutMs = 60_000,
): Promise<{
	status: TaskStatus;
	result: Record<string, unknown> | null;
	errorCode: string | null;
	errorMessage: string | null;
}> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const row = db
			.prepare(
				`SELECT status, result_json, error_code, error_message FROM tasks WHERE id = ?`,
			)
			.get(taskId) as
			| {
					status: TaskStatus;
					result_json: string | null;
					error_code: string | null;
					error_message: string | null;
			  }
			| undefined;
		if (!row) throw new Error("Task not found");
		if (TERMINAL.includes(row.status)) {
			let result: Record<string, unknown> | null = null;
			if (row.result_json) {
				try {
					result = JSON.parse(row.result_json) as Record<string, unknown>;
				} catch {
					result = null;
				}
			}
			return {
				status: row.status,
				result,
				errorCode: row.error_code,
				errorMessage: row.error_message,
			};
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error("Task wait timeout");
}
