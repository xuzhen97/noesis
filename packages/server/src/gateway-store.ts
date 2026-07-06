import type { Database } from "better-sqlite3";
import type { Machine, Task, TaskEvent } from "@noesis/shared";

const nowIso = () => new Date().toISOString();

/** 任务创建前确保 machines 行存在，满足外键约束。 */
export function ensureMachineRow(db: Database, machineId: string): void {
	const ts = nowIso();
	db.prepare(
		`INSERT INTO machines (id, name, status, created_at, updated_at)
     VALUES (?, ?, 'offline', ?, ?)
     ON CONFLICT(id) DO NOTHING`,
	).run(machineId, machineId, ts, ts);
}

export function upsertMachineOnline(db: Database, machine: Machine): void {
	const ts = machine.lastSeenAt ?? nowIso();
	const disksJson = machine.disks?.length
		? JSON.stringify(machine.disks)
		: null;
	db.prepare(
		`INSERT INTO machines (id, name, status, disks_json, last_seen_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       status = excluded.status,
       disks_json = excluded.disks_json,
       last_seen_at = excluded.last_seen_at,
       updated_at = excluded.updated_at`,
	).run(machine.id, machine.name, machine.status, disksJson, ts, ts, ts);
}

export function listMachines(db: Database): Machine[] {
	const rows = db
		.prepare(
			`SELECT id, name, status, disks_json, last_seen_at FROM machines ORDER BY updated_at DESC`,
		)
		.all() as Array<{
		id: string;
		name: string;
		status: Machine["status"];
		disks_json: string | null;
		last_seen_at: string | null;
	}>;
	return rows.map((row) => {
		let disks: Machine["disks"];
		if (row.disks_json) {
			try {
				disks = JSON.parse(row.disks_json) as Machine["disks"];
			} catch {
				disks = undefined;
			}
		}
		return {
			id: row.id,
			name: row.name,
			status: row.status,
			lastSeenAt: row.last_seen_at ?? undefined,
			disks,
		};
	});
}

export function getMachineRow(db: Database, machineId: string): Machine | null {
	const row = db
		.prepare(
			`SELECT id, name, status, disks_json, last_seen_at FROM machines WHERE id = ?`,
		)
		.get(machineId) as
		| {
				id: string;
				name: string;
				status: Machine["status"];
				disks_json: string | null;
				last_seen_at: string | null;
		  }
		| undefined;
	if (!row) return null;
	let disks: Machine["disks"];
	if (row.disks_json) {
		try {
			disks = JSON.parse(row.disks_json) as Machine["disks"];
		} catch {
			disks = undefined;
		}
	}
	return {
		id: row.id,
		name: row.name,
		status: row.status,
		lastSeenAt: row.last_seen_at ?? undefined,
		disks,
	};
}

export function setMachineOffline(
	db: Database,
	machineId: string,
	lastSeenAt: string,
): void {
	db.prepare(
		`UPDATE machines SET status = 'offline', last_seen_at = ?, updated_at = ? WHERE id = ?`,
	).run(lastSeenAt, lastSeenAt, machineId);
}

export function insertTask(db: Database, task: Task): void {
	const ts = nowIso();
	db.prepare(
		`INSERT INTO tasks (id, machine_id, task_type, status, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
	).run(
		task.id,
		task.machineId ?? null,
		task.taskType,
		task.status,
		JSON.stringify(task.payload),
		ts,
		ts,
	);
}

export function updateTaskStatus(
	db: Database,
	taskId: string,
	status: Task["status"],
): void {
	db.prepare(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`).run(
		status,
		nowIso(),
		taskId,
	);
}

export function updateTaskResult(
	db: Database,
	taskId: string,
	status: Task["status"],
	result: Record<string, unknown>,
	errorCode?: string,
	errorMessage?: string,
): void {
	const ts = nowIso();
	db.prepare(
		`UPDATE tasks SET status = ?, result_json = ?, error_code = ?, error_message = ?, updated_at = ?, finished_at = ? WHERE id = ?`,
	).run(
		status,
		JSON.stringify(result),
		errorCode ?? null,
		errorMessage ?? null,
		ts,
		ts,
		taskId,
	);
}

export function getTaskRow(db: Database, taskId: string): Task | null {
	const row = db
		.prepare(
			`SELECT id, machine_id, task_type, status, payload_json FROM tasks WHERE id = ?`,
		)
		.get(taskId) as
		| {
				id: string;
				machine_id: string | null;
				task_type: string;
				status: Task["status"];
				payload_json: string;
		  }
		| undefined;
	if (!row) return null;
	let payload: Record<string, unknown> = {};
	try {
		payload = JSON.parse(row.payload_json) as Record<string, unknown>;
	} catch {
		payload = {};
	}
	return {
		id: row.id,
		machineId: row.machine_id ?? undefined,
		taskType: row.task_type as Task["taskType"],
		status: row.status,
		payload,
	};
}

export function insertTaskEvent(db: Database, event: TaskEvent): void {
	db.prepare(
		`INSERT INTO task_events (id, task_id, event_type, level, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
	).run(
		event.id,
		event.taskId,
		event.type,
		event.level,
		JSON.stringify(event.data),
		nowIso(),
	);
}

export function listTaskIdsWaitingClient(
	db: Database,
	machineId: string,
): string[] {
	const rows = db
		.prepare(
			`SELECT id FROM tasks WHERE machine_id = ? AND status = 'waiting_client'`,
		)
		.all(machineId) as Array<{ id: string }>;
	return rows.map((r) => r.id);
}

export function listTaskEvents(db: Database, taskId: string): TaskEvent[] {
	const rows = db
		.prepare(
			`SELECT id, task_id, event_type, level, data_json FROM task_events
       WHERE task_id = ? ORDER BY created_at ASC`,
		)
		.all(taskId) as Array<{
		id: string;
		task_id: string;
		event_type: string;
		level: TaskEvent["level"];
		data_json: string | null;
	}>;
	return rows.map((row) => {
		let data: Record<string, unknown> = {};
		if (row.data_json) {
			try {
				data = JSON.parse(row.data_json) as Record<string, unknown>;
			} catch {
				data = {};
			}
		}
		return {
			id: row.id,
			taskId: row.task_id,
			type: row.event_type,
			level: row.level,
			data,
		};
	});
}
