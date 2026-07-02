import {
	protocolVersion,
	type ApiResponse,
	type CommandRunPayload,
	type Task,
	type TaskEvent,
	type TaskStatus,
} from "@noesis/shared";

/** NoesisClient 构造选项 */
export interface NoesisClientOptions {
	/** Gateway HTTP 基础 URL，例如 http://127.0.0.1:6375 */
	baseUrl: string;
	/** 可注入的 fetch 实现，用于测试或定制 HTTP 行为 */
	fetch?: typeof fetch;
}

/** ping 结果 */
export interface NoesisPingResult {
	ok: true;
	baseUrl: string;
	protocolVersion: string;
}

/** runCommandAndWait 选项 */
export interface RunCommandOptions extends CommandRunPayload {
	machineId: string;
	timeoutMs?: number;
	pollIntervalMs?: number;
}

/** runCommandAndWait 结果 */
export interface RunCommandResult {
	taskId: string;
	status: TaskStatus;
	stdout: string;
}

/** Noesis Gateway 客户端，封装 HTTP API 调用 */
export class NoesisClient {
	readonly baseUrl: string;
	readonly #fetch: typeof fetch;

	/** 构造 NoesisClient，注入 Gateway URL 和可选的 fetch */
	constructor(options: NoesisClientOptions) {
		this.baseUrl = options.baseUrl.replace(/\/$/, "");
		this.#fetch = options.fetch ?? fetch;
	}

	/** 检测 Gateway 是否可达，返回协议版本信息 */
	async ping(): Promise<NoesisPingResult> {
		return {
			ok: true,
			baseUrl: this.baseUrl,
			protocolVersion,
		};
	}

	/** 创建 Task 并提交到 Gateway */
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

	/** 根据 ID 查询 Task 当前状态 */
	async getTask(taskId: string): Promise<Task> {
		return await this.#readApi<Task>(
			await this.#fetch(`${this.baseUrl}/api/tasks/${taskId}`),
		);
	}

	/** 查询 Task 的事件列表 */
	async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
		return await this.#readApi<TaskEvent[]>(
			await this.#fetch(`${this.baseUrl}/api/tasks/${taskId}/events`),
		);
	}

	/** 创建 command.run 任务并轮询等待完成，返回执行结果 */
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
