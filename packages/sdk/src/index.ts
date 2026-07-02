import {
	protocolVersion,
	type ApiResponse,
	type CommandRunPayload,
	type Task,
	type TaskEvent,
	type TaskStatus,
} from "@noesis/shared";

export interface NoesisClientOptions {
	baseUrl: string;
	fetch?: typeof fetch;
}

export interface NoesisPingResult {
	ok: true;
	baseUrl: string;
	protocolVersion: string;
}

export interface RunCommandOptions extends CommandRunPayload {
	machineId: string;
	timeoutMs?: number;
	pollIntervalMs?: number;
}

export interface RunCommandResult {
	taskId: string;
	status: TaskStatus;
	stdout: string;
}

export class NoesisClient {
	readonly baseUrl: string;
	readonly #fetch: typeof fetch;

	constructor(options: NoesisClientOptions) {
		this.baseUrl = options.baseUrl.replace(/\/$/, "");
		this.#fetch = options.fetch ?? fetch;
	}

	async ping(): Promise<NoesisPingResult> {
		return {
			ok: true,
			baseUrl: this.baseUrl,
			protocolVersion,
		};
	}

	async createTask(input: {
		machineId: string;
		taskType: "command.run";
		payload: CommandRunPayload;
	}): Promise<Task> {
		const response = await this.#fetch(`${this.baseUrl}/api/tasks`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(input),
		});
		return await this.#readApi<Task>(response);
	}

	async getTask(taskId: string): Promise<Task> {
		return await this.#readApi<Task>(
			await this.#fetch(`${this.baseUrl}/api/tasks/${taskId}`),
		);
	}

	async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
		return await this.#readApi<TaskEvent[]>(
			await this.#fetch(`${this.baseUrl}/api/tasks/${taskId}/events`),
		);
	}

	async runCommandAndWait(
		options: RunCommandOptions,
	): Promise<RunCommandResult> {
		const task = await this.createTask({
			machineId: options.machineId,
			taskType: "command.run",
			payload: { command: options.command },
		});
		const deadline = Date.now() + (options.timeoutMs ?? 5000);
		const pollIntervalMs = options.pollIntervalMs ?? 100;

		while (Date.now() <= deadline) {
			const current = await this.getTask(task.id);
			if (
				["succeeded", "failed", "canceled", "timeout"].includes(current.status)
			) {
				const events = await this.getTaskEvents(task.id);
				const stdout = events
					.map((event) =>
						typeof event.data.stdout === "string" ? event.data.stdout : "",
					)
					.join("");
				return { taskId: task.id, status: current.status, stdout };
			}
			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
		}

		throw new Error(`Task ${task.id} did not finish before timeout`);
	}

	async #readApi<T>(response: Response): Promise<T> {
		const body = (await response.json()) as ApiResponse<T>;
		if (!body.ok) throw new Error(body.error.message);
		return body.data;
	}
}
