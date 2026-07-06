import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import {
	createNoesisError,
	protocolVersion,
	type ApiResponse,
	type GatewayToClientMessage,
	type GatewayHealth,
	type GatewayInfo,
	type Machine,
	type Task,
	type TaskType,
} from "@noesis/shared";
import { readBearerToken, ownerTokenEquals } from "./auth.js";
import { openGatewayDb } from "./db/sqlite.js";
import { AliyunDriveAuthService } from "./storage/aliyundrive/auth.js";
import { resolveGatewayDataKey } from "./secret-box.js";
import {
	ensureMachineRow,
	getMachineRow,
	getTaskRow,
	insertTask,
	insertTaskEvent,
	listTaskEvents,
	listMachines,
	updateTaskStatus,
} from "./gateway-store.js";
import {
	createFileTask,
	waitForTaskTerminal,
	type FileTaskKind,
} from "./file-tasks.js";
import { TransferService } from "./transfer.js";
import { attachGatewayWebSocket, type GatewayWsState } from "./gateway-ws.js";

/** Gateway 启动选项 */
export interface GatewayRuntimeOptions {
	/** 监听端口 */
	port: number;
	/** Owner Token：Gateway 控制面凭证 */
	ownerToken: string;
	/** Web 静态文件目录（可选） */
	webDir?: string;
	/** SQLite 路径，默认 :memory: */
	databasePath?: string;
	/** 数据目录（密钥文件），默认 os.tmpdir/noesis-gateway */
	dataDir?: string;
}

/** Gateway 运行时实例，包含 HTTP/WS URL 和关闭方法 */
export interface GatewayRuntime {
	/** HTTP URL，如 http://127.0.0.1:6375 */
	httpUrl: string;
	/** WebSocket URL，如 ws://127.0.0.1:6375 */
	wsUrl: string;
	/** 实际绑定的端口号 */
	port: number;
	/** 优雅关闭 Gateway：断开所有客户端连接并停止 HTTP 服务 */
	close(): Promise<void>;
}

function json<T>(
	response: ServerResponse,
	statusCode: number,
	body: ApiResponse<T>,
): void {
	response.writeHead(statusCode, {
		"content-type": "application/json; charset=utf-8",
	});
	response.end(JSON.stringify(body));
}

function ok<T>(data: T): ApiResponse<T> {
	return { ok: true, data, requestId: randomUUID() };
}

function fail(
	code: Parameters<typeof createNoesisError>[0],
	message: string,
): ApiResponse<never> {
	return {
		ok: false,
		error: createNoesisError(code, message),
		requestId: randomUUID(),
	};
}

async function readBody(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	if (chunks.length === 0) return {};
	const text = Buffer.concat(chunks).toString("utf8");
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw createNoesisError("BAD_REQUEST", "Invalid JSON body");
	}
}

function dispatchIfPossible(
	db: import("better-sqlite3").Database,
	gatewayState: GatewayWsState,
	task: Task,
): void {
	const client =
		task.machineId === undefined
			? undefined
			: gatewayState.clients.get(task.machineId);
	if (!client || client.readyState !== client.OPEN) {
		updateTaskStatus(db, task.id, "waiting_client");
		return;
	}
	updateTaskStatus(db, task.id, "dispatched");
	insertTaskEvent(db, {
		id: `event_${randomUUID()}`,
		taskId: task.id,
		type: "task.dispatched",
		level: "info",
		data: { machineId: task.machineId },
	});
	const dispatched = getTaskRow(db, task.id) ?? task;
	client.send(
		JSON.stringify({
			type: "task.dispatch",
			task: dispatched,
		} satisfies GatewayToClientMessage),
	);
}

function isCommandRunRequest(value: unknown): value is {
	machineId: string;
	taskType: TaskType;
	payload: Record<string, unknown>;
} {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.machineId === "string" &&
		record.taskType === "command.run" &&
		typeof record.payload === "object" &&
		record.payload !== null
	);
}

export async function startGateway(
	options: GatewayRuntimeOptions,
): Promise<GatewayRuntime> {
	const db = openGatewayDb(options.databasePath ?? ":memory:");
	const dataDir =
		options.dataDir ?? join(process.env.TEMP ?? "/tmp", "noesis-gateway");
	mkdirSync(dataDir, { recursive: true });
	const secretKey = resolveGatewayDataKey(dataDir);
	const aliyunAuth = new AliyunDriveAuthService(db, secretKey);
	const gatewayState: GatewayWsState = {
		machines: new Map(),
		clients: new Map(),
	};

	function sendToMachine(
		machineId: string,
		message: GatewayToClientMessage,
	): boolean {
		const client = gatewayState.clients.get(machineId);
		if (!client || client.readyState !== client.OPEN) return false;
		client.send(JSON.stringify(message));
		return true;
	}

	const transferService = new TransferService(db, aliyunAuth, {
		sendToMachine,
	});

	const server = createServer(
		async (request: IncomingMessage, response: ServerResponse) => {
			const url = new URL(request.url ?? "/", "http://127.0.0.1");

			// 静态 Web 文件和 /api/health 公开；其余接口需要 Owner Token
			const isPublic =
				(request.method === "GET" && url.pathname === "/api/health") ||
				(options.webDir !== undefined &&
					request.method === "GET" &&
					!url.pathname.startsWith("/api"));
			if (!isPublic) {
				const bearer = readBearerToken(request.headers.authorization);
				if (bearer === null) {
					json(
						response,
						401,
						fail("OWNER_TOKEN_REQUIRED", "Owner Token is required"),
					);
					return;
				}
				if (!ownerTokenEquals(options.ownerToken, bearer)) {
					json(
						response,
						401,
						fail("INVALID_OWNER_TOKEN", "Invalid Owner Token"),
					);
					return;
				}
			}

			if (request.method === "GET" && url.pathname === "/api/health") {
				json<GatewayHealth>(
					response,
					200,
					ok({
						ok: true,
						service: "gateway",
						protocolVersion,
					}),
				);
				return;
			}

			if (request.method === "GET" && url.pathname === "/api/gateway/info") {
				json<GatewayInfo>(
					response,
					200,
					ok({
						name: "Noesis Gateway",
						service: "gateway",
						protocolVersion,
						auth: { mode: "owner-token" },
						capabilities: [
							"tasks.command.run",
							"tasks.file.list",
							"tasks.file.read",
							"tasks.file.write",
							"machines.client-agent",
							"storage.aliyundrive",
						],
					}),
				);
				return;
			}

			if (request.method === "POST" && url.pathname === "/api/tasks") {
				const body = await readBody(request);
				if (!isCommandRunRequest(body)) {
					json(
						response,
						400,
						fail("BAD_REQUEST", "Invalid command.run task request"),
					);
					return;
				}
				ensureMachineRow(db, body.machineId);
				const task: Task = {
					id: `task_${randomUUID()}`,
					machineId: body.machineId,
					taskType: "command.run",
					status: "created",
					payload: body.payload,
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
				dispatchIfPossible(db, gatewayState, getTaskRow(db, task.id) ?? task);
				json(response, 201, ok(getTaskRow(db, task.id) ?? task));
				return;
			}

			const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
			if (request.method === "GET" && taskMatch) {
				const found = getTaskRow(db, taskMatch[1]);
				json(
					response,
					found ? 200 : 404,
					found ? ok(found) : fail("TASK_NOT_FOUND", "Task not found"),
				);
				return;
			}

			const eventsMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/events$/);
			if (request.method === "GET" && eventsMatch) {
				const taskRow = getTaskRow(db, eventsMatch[1]);
				if (!taskRow) {
					json(response, 404, fail("TASK_NOT_FOUND", "Task not found"));
					return;
				}
				json(response, 200, ok(listTaskEvents(db, eventsMatch[1])));
				return;
			}

			// 静态 Web 文件
			if (
				options.webDir !== undefined &&
				request.method === "GET" &&
				!url.pathname.startsWith("/api")
			) {
				const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
				// 防路径穿越
				const resolved = resolve(options.webDir, "." + normalize(filePath));
				if (!resolved.startsWith(options.webDir)) {
					json(response, 403, fail("BAD_REQUEST", "Forbidden"));
					return;
				}
				try {
					const content = await readFile(resolved);
					const mime: Record<string, string> = {
						".html": "text/html; charset=utf-8",
						".js": "application/javascript; charset=utf-8",
						".css": "text/css; charset=utf-8",
						".svg": "image/svg+xml",
						".png": "image/png",
						".ico": "image/x-icon",
						".json": "application/json; charset=utf-8",
					};
					const ext = extname(filePath);
					response.writeHead(200, {
						"content-type": mime[ext] ?? "application/octet-stream",
					});
					response.end(content);
					return;
				} catch {
					json(response, 404, fail("BAD_REQUEST", "Not found"));
					return;
				}
			}

			if (request.method === "GET" && url.pathname === "/api/machines") {
				const fromDb = listMachines(db);
				const merged = new Map<string, Machine>();
				for (const m of fromDb) merged.set(m.id, m);
				for (const [id, m] of gatewayState.machines) merged.set(id, m);
				json(response, 200, ok([...merged.values()]));
				return;
			}

			const machineMatch = url.pathname.match(/^\/api\/machines\/([^/]+)$/);
			if (request.method === "GET" && machineMatch) {
				const machine =
					gatewayState.machines.get(machineMatch[1]) ??
					getMachineRow(db, machineMatch[1]);
				json(
					response,
					machine ? 200 : 404,
					machine
						? ok(machine)
						: fail("MACHINE_NOT_FOUND", "Machine not found"),
				);
				return;
			}

			async function runFileApi(
				taskType: FileTaskKind,
				body: Record<string, unknown>,
			) {
				if (typeof body.machineId !== "string") {
					json(response, 400, fail("BAD_REQUEST", "machineId is required"));
					return;
				}
				const payload = { ...body };
				delete payload.machineId;
				const task = createFileTask(db, {
					machineId: body.machineId,
					taskType,
					payload,
				});
				dispatchIfPossible(db, gatewayState, task);
				try {
					const done = await waitForTaskTerminal(db, task.id);
					if (done.status !== "succeeded") {
						json(
							response,
							502,
							fail(
								"NOESIS_UNAVAILABLE",
								done.errorMessage ?? "File task failed",
							),
						);
						return;
					}
					json(response, 200, ok(done.result ?? {}));
				} catch (error) {
					json(
						response,
						504,
						fail(
							"TASK_TIMEOUT",
							error instanceof Error ? error.message : "Timeout",
						),
					);
				}
			}

			if (request.method === "POST" && url.pathname === "/api/files/list") {
				const body = (await readBody(request)) as Record<string, unknown>;
				if (typeof body.path !== "string") {
					json(response, 400, fail("BAD_REQUEST", "path is required"));
					return;
				}
				await runFileApi("file.list", body);
				return;
			}

			if (request.method === "POST" && url.pathname === "/api/files/read") {
				const body = (await readBody(request)) as Record<string, unknown>;
				if (typeof body.path !== "string") {
					json(response, 400, fail("BAD_REQUEST", "path is required"));
					return;
				}
				await runFileApi("file.read", body);
				return;
			}

			if (request.method === "POST" && url.pathname === "/api/files/write") {
				const body = (await readBody(request)) as Record<string, unknown>;
				if (typeof body.path !== "string" || typeof body.content !== "string") {
					json(
						response,
						400,
						fail("BAD_REQUEST", "path and content are required"),
					);
					return;
				}
				await runFileApi("file.write", body);
				return;
			}

			if (
				request.method === "GET" &&
				url.pathname === "/api/aliyundrive/status"
			) {
				json(response, 200, ok(aliyunAuth.getStatus()));
				return;
			}

			if (
				request.method === "PUT" &&
				url.pathname === "/api/aliyundrive/config"
			) {
				const body = (await readBody(request)) as Record<string, unknown>;
				if (typeof body.clientId !== "string" || !body.clientId.trim()) {
					json(response, 400, fail("BAD_REQUEST", "clientId is required"));
					return;
				}
				const saved = aliyunAuth.saveConfig({
					clientId: body.clientId,
					clientSecret:
						typeof body.clientSecret === "string"
							? body.clientSecret
							: undefined,
					scope: typeof body.scope === "string" ? body.scope : undefined,
					openapiBase:
						typeof body.openapiBase === "string" ? body.openapiBase : undefined,
					redirectUri:
						typeof body.redirectUri === "string" ? body.redirectUri : undefined,
					transferFolder:
						typeof body.transferFolder === "string"
							? body.transferFolder
							: undefined,
				});
				json(response, 200, ok({ configured: true, clientId: saved.clientId }));
				return;
			}

			if (
				request.method === "POST" &&
				url.pathname === "/api/aliyundrive/oauth/start"
			) {
				const body = (await readBody(request)) as Record<string, unknown>;
				try {
					const start = aliyunAuth.startOAuth(
						typeof body.clientId === "string"
							? { clientId: body.clientId }
							: {},
					);
					json(response, 200, ok(start));
				} catch (error) {
					json(
						response,
						400,
						fail(
							"BAD_REQUEST",
							error instanceof Error ? error.message : String(error),
						),
					);
				}
				return;
			}

			if (
				request.method === "POST" &&
				url.pathname === "/api/aliyundrive/oauth/complete"
			) {
				const body = (await readBody(request)) as Record<string, unknown>;
				if (typeof body.state !== "string" || typeof body.code !== "string") {
					json(
						response,
						400,
						fail("BAD_REQUEST", "state and code are required"),
					);
					return;
				}
				try {
					const status = await aliyunAuth.completeOAuth({
						state: body.state,
						code: body.code,
					});
					json(response, 200, ok(status));
				} catch (err) {
					json(
						response,
						502,
						fail(
							"OAUTH_COMPLETE_FAILED",
							err instanceof Error ? err.message : "oauth complete failed",
						),
					);
				}
				return;
			}

			if (
				request.method === "POST" &&
				url.pathname === "/api/aliyundrive/oauth/revoke"
			) {
				aliyunAuth.revoke();
				json(response, 200, ok(aliyunAuth.getStatus()));
				return;
			}

			if (
				request.method === "POST" &&
				url.pathname === "/api/aliyundrive/test"
			) {
				const result = await aliyunAuth.testAuthorization();
				json(response, 200, ok(result));
				return;
			}

			const transferIdMatch = url.pathname.match(/^\/api\/transfers\/([^/]+)$/);
			const transferActionMatch = url.pathname.match(
				/^\/api\/transfers\/([^/]+)\/([a-z-]+)$/,
			);

			if (
				request.method === "POST" &&
				(url.pathname === "/api/transfers/uploads" ||
					url.pathname === "/api/transfers/exports")
			) {
				const body = (await readBody(request)) as Record<string, unknown>;
				if (
					typeof body.machineId !== "string" ||
					typeof body.filename !== "string" ||
					typeof body.size !== "number" ||
					typeof body.path !== "string"
				) {
					json(
						response,
						400,
						fail("BAD_REQUEST", "machineId, path, filename, size required"),
					);
					return;
				}
				try {
					const plan =
						url.pathname === "/api/transfers/exports"
							? await transferService.createExportUpload({
									machineId: body.machineId,
									rootId:
										typeof body.rootId === "string" ? body.rootId : undefined,
									path: body.path,
									filename: body.filename,
									size: body.size,
								})
							: await transferService.createImportUpload({
									machineId: body.machineId,
									rootId:
										typeof body.rootId === "string" ? body.rootId : undefined,
									path: body.path,
									filename: body.filename,
									size: body.size,
									transfer:
										body.transfer === "aliyundrive" ? "aliyundrive" : "auto",
								});
					json(response, 201, ok(plan));
				} catch (error) {
					json(
						response,
						400,
						fail(
							"BAD_REQUEST",
							error instanceof Error ? error.message : String(error),
						),
					);
				}
				return;
			}

			if (request.method === "GET" && transferIdMatch) {
				const transferId = transferIdMatch[1];
				const job = transferService.getTransfer(transferId);
				json(
					response,
					job ? 200 : 404,
					job ? ok(job) : fail("BAD_REQUEST", "Transfer not found"),
				);
				return;
			}

			if (transferActionMatch) {
				const transferId = transferActionMatch[1];
				const action = transferActionMatch[2];
				const body =
					request.method === "POST"
						? ((await readBody(request)) as Record<string, unknown>)
						: {};
				try {
					if (action === "upload-plan" && request.method === "GET") {
						const plan = await transferService.getUploadPlan(transferId);
						json(response, 200, ok(plan));
						return;
					}
					if (
						action === "client-export-complete" &&
						request.method === "POST"
					) {
						const job = await transferService.completeClientExport(transferId);
						json(response, 200, ok(job));
						return;
					}
					if (action === "cli-progress" && request.method === "POST") {
						const job = transferService.recordCliProgress(transferId, {
							uploadedBytes: Number(body.uploadedBytes ?? 0),
							totalBytes: Number(body.totalBytes ?? 0),
							currentPart:
								body.currentPart === undefined
									? undefined
									: Number(body.currentPart),
						});
						json(response, 200, ok(job));
						return;
					}
					if (
						(action === "cli-upload-complete" ||
							action === "web-upload-complete") &&
						request.method === "POST"
					) {
						const job = await transferService.completeCliUpload(transferId);
						json(response, 200, ok(job));
						return;
					}
					if (action === "refresh-download-url" && request.method === "POST") {
						const urls = await transferService.refreshDownloadUrl(transferId);
						json(response, 200, ok(urls));
						return;
					}
					if (action === "client-progress" && request.method === "POST") {
						transferService.recordClientProgress(transferId, body);
						json(response, 200, ok(transferService.getTransfer(transferId)));
						return;
					}
					if (action === "client-complete" && request.method === "POST") {
						const job = transferService.completeClientDownload(transferId);
						json(response, 200, ok(job));
						return;
					}
					if (action === "client-failed" && request.method === "POST") {
						const job = transferService.failTransfer(transferId, {
							errorCode: String(body.errorCode ?? "CLIENT_FAILED"),
							errorMessage: String(body.errorMessage ?? "Client failed"),
						});
						json(response, 200, ok(job));
						return;
					}
				} catch (error) {
					json(
						response,
						400,
						fail(
							"BAD_REQUEST",
							error instanceof Error ? error.message : String(error),
						),
					);
					return;
				}
			}

			json(response, 404, fail("BAD_REQUEST", "Route not found"));
		},
	);

	const wss = attachGatewayWebSocket({
		server,
		db,
		ownerToken: options.ownerToken,
		gatewayState,
		dispatchTask: (task) => dispatchIfPossible(db, gatewayState, task),
	});

	await new Promise<void>((resolve) =>
		server.listen(options.port, "127.0.0.1", () => resolve()),
	);
	const address = server.address();
	if (typeof address !== "object" || address === null) {
		throw new Error("Gateway did not bind a TCP port");
	}
	const port = address.port;

	return {
		port,
		httpUrl: `http://127.0.0.1:${port}`,
		wsUrl: `ws://127.0.0.1:${port}`,
		close: async () => {
			for (const client of gatewayState.clients.values()) client.close();
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
			wss.close();
		},
	};
}
