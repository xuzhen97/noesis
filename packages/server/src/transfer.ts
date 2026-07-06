import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { GatewayToClientMessage } from "@noesis/shared";
import type { AliyunDriveAuthService } from "./storage/aliyundrive/auth.js";
import { AliyunDriveOpenApiClient } from "./storage/aliyundrive/openapi.js";
import {
	buildPartInfoList,
	resolveAliyunPartSize,
	resolvePartSize,
} from "./storage/aliyundrive/upload-planner.js";
import { ensureMachineRow } from "./gateway-store.js";
import { isStorageMock } from "./storage/mock.js";

export type TransferUploadPlan =
	| { mode: "frps_chunked" }
	| {
			mode: "aliyundrive";
			transferId: string;
			accessToken: string;
			openapiBase: string;
			driveId: string;
			fileId: string;
			uploadId: string;
			partSize: number;
			partCount: number;
			uploadParts: Array<{
				partNumber: number;
				uploadUrl: string;
				size: number;
			}>;
	  };

export interface TransferJobView {
	id: string;
	machineId: string;
	rootId: string | null;
	targetDir: string;
	filename: string;
	size: number;
	mode: string;
	status: string;
	direction: string;
	uploadedBytes: number;
	downloadedBytes: number;
	writtenBytes: number;
	totalBytes: number;
	errorCode: string | null;
	errorMessage: string | null;
	downloadUrl?: string;
}

const nowIso = () => new Date().toISOString();

/** 存储中转任务（阿里云盘 v1）。 */
export class TransferService {
	constructor(
		private readonly db: Database.Database,
		private readonly aliyunAuth: AliyunDriveAuthService,
		private readonly deps: {
			sendToMachine: (
				machineId: string,
				message: GatewayToClientMessage,
			) => boolean;
		},
	) {}

	private id(): string {
		return `tr_${randomUUID().replace(/-/g, "")}`;
	}

	async createImportUpload(input: {
		machineId: string;
		rootId?: string;
		path: string;
		filename: string;
		size: number;
		transfer?: "auto" | "aliyundrive";
	}): Promise<TransferUploadPlan> {
		ensureMachineRow(this.db, input.machineId);
		const status = this.aliyunAuth.getStatus();
		const useAliyun =
			isStorageMock() || (status.configured && status.authorized);
		if (!useAliyun) {
			if (input.transfer === "aliyundrive") {
				throw new Error("Aliyun Drive is not configured or authorized");
			}
			return { mode: "frps_chunked" };
		}

		const config =
			this.aliyunAuth.getConfig() ??
			this.aliyunAuth.getDefaultConfig({ clientId: "mock-client" });
		const auth = this.aliyunAuth.getAuth();
		const accessToken = isStorageMock()
			? "mock-access-token"
			: auth?.accessToken;
		if (!accessToken) throw new Error("Aliyun Drive auth is missing");

		const driveId =
			auth?.driveId ?? (isStorageMock() ? "mock-drive" : undefined);
		if (!driveId) throw new Error("driveId is missing; run aliyundrive test");

		const transferId = this.id();
		const partSize = resolveAliyunPartSize(input.size);
		const partInfoList = buildPartInfoList(input.size, partSize);
		const openapiBase = config.openapiBase;

		let fileId: string;
		let uploadId: string;
		let remoteParts: Array<Record<string, unknown>>;

		if (isStorageMock()) {
			fileId = `mock-file-${transferId}`;
			uploadId = `mock-upload-${transferId}`;
			remoteParts = partInfoList.map((p) => ({
				part_number: p.part_number,
				upload_url: `mock://upload/${transferId}/${p.part_number}`,
			}));
		} else {
			const client = new AliyunDriveOpenApiClient({
				openapiBase,
				accessToken,
			});
			const parentFileId = await client.ensureFolderPath({
				driveId,
				folderPath: config.transferFolder,
			});
			const createResult = await client.createFileUpload({
				driveId,
				parentFileId,
				name: `${transferId}-${input.filename}`,
				size: input.size,
				partInfoList,
			});
			fileId = String(createResult.file_id ?? createResult.fileId);
			uploadId = String(createResult.upload_id ?? createResult.uploadId);
			remoteParts = (createResult.part_info_list ?? []) as Array<
				Record<string, unknown>
			>;
			this.insertJob({
				transferId,
				machineId: input.machineId,
				rootId: input.rootId ?? "default",
				targetDir: input.path,
				filename: input.filename,
				size: input.size,
				driveId,
				fileId,
				uploadId,
				parentFileId,
				aliyunFileName: `${transferId}-${input.filename}`,
				partCount: partInfoList.length,
				totalBytes: input.size,
			});
			this.addEvent(transferId, "created", { status: "waiting_cli_upload" });
			return this.planFromRow(
				transferId,
				accessToken,
				openapiBase,
				driveId,
				fileId,
				uploadId,
				partSize,
				partInfoList.length,
				input.size,
				remoteParts,
			);
		}

		this.insertJob({
			transferId,
			machineId: input.machineId,
			rootId: input.rootId ?? "default",
			targetDir: input.path,
			filename: input.filename,
			size: input.size,
			driveId,
			fileId,
			uploadId,
			parentFileId: "mock-parent",
			aliyunFileName: `${transferId}-${input.filename}`,
			partCount: partInfoList.length,
			totalBytes: input.size,
		});
		this.addEvent(transferId, "created", { status: "waiting_cli_upload" });

		return this.planFromRow(
			transferId,
			accessToken,
			openapiBase,
			driveId,
			fileId,
			uploadId,
			partSize,
			partInfoList.length,
			input.size,
			remoteParts,
		);
	}

	private async buildRemoteParts(options: {
		config: ReturnType<AliyunDriveAuthService["getConfig"]>;
		accessToken: string;
		driveId: string;
		fileId: string;
		uploadId: string;
		partInfoList: ReturnType<typeof buildPartInfoList>;
	}): Promise<Array<Record<string, unknown>>> {
		const { config, accessToken, driveId, fileId, uploadId, partInfoList } =
			options;
		if (!config) throw new Error("Aliyun Drive not configured");
		const client = new AliyunDriveOpenApiClient({
			openapiBase: config.openapiBase,
			accessToken,
		});
		const result = await client.getUploadUrl({
			driveId,
			fileId,
			uploadId,
			partNumbers: partInfoList.map((p) => p.part_number),
		});
		const list = Array.isArray(result.part_info_list)
			? (result.part_info_list as Array<Record<string, unknown>>)
			: [];
		return partInfoList.map((p) => {
			const part =
				list.find((item) => Number(item.part_number) === p.part_number) ?? {};
			return {
				part_number: p.part_number,
				upload_url: String(part.upload_url ?? part.uploadUrl ?? ""),
			};
		});
	}

	private planFromRow(
		transferId: string,
		accessToken: string,
		openapiBase: string,
		driveId: string,
		fileId: string,
		uploadId: string,
		partSize: number,
		partCount: number,
		totalBytes: number,
		remoteParts: Array<Record<string, unknown>>,
	): TransferUploadPlan {
		return {
			mode: "aliyundrive",
			transferId,
			accessToken,
			openapiBase,
			driveId,
			fileId,
			uploadId,
			partSize,
			partCount,
			uploadParts: remoteParts.map((part, index) => ({
				partNumber: Number(part.part_number ?? index + 1),
				uploadUrl: String(part.upload_url ?? ""),
				size: resolvePartSize(
					totalBytes,
					partSize,
					Number(part.part_number ?? index + 1),
				),
			})),
		};
	}

	getTransfer(id: string): TransferJobView | null {
		const row = this.db
			.prepare("SELECT * FROM transfer_jobs WHERE id = ?")
			.get(id) as Record<string, unknown> | undefined;
		return row ? this.rowToView(row) : null;
	}

	recordCliProgress(
		transferId: string,
		progress: {
			uploadedBytes: number;
			totalBytes: number;
			currentPart?: number;
		},
	): TransferJobView | null {
		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET status = 'cli_uploading', phase = 'cli_uploading',
         uploaded_bytes = ?, total_bytes = ?, current_part = ?, updated_at = ? WHERE id = ?`,
			)
			.run(
				progress.uploadedBytes,
				progress.totalBytes,
				progress.currentPart ?? null,
				ts,
				transferId,
			);
		this.addEvent(transferId, "cli_progress", progress);
		return this.getTransfer(transferId);
	}

	async completeCliUpload(transferId: string): Promise<TransferJobView | null> {
		const job = this.getTransfer(transferId);
		if (!job) throw new Error("Transfer not found");

		if (!isStorageMock()) {
			const row = this.db
				.prepare(
					`SELECT aliyun_drive_id, aliyun_file_id, aliyun_upload_id FROM transfer_jobs WHERE id = ?`,
				)
				.get(transferId) as Record<string, unknown>;
			const config = this.aliyunAuth.getConfig();
			const auth = this.aliyunAuth.getAuth();
			if (!config || !auth?.accessToken) {
				throw new Error("Aliyun Drive auth is missing");
			}
			const client = new AliyunDriveOpenApiClient({
				openapiBase: config.openapiBase,
				accessToken: auth.accessToken,
			});
			await client.completeUpload({
				driveId: String(row.aliyun_drive_id),
				fileId: String(row.aliyun_file_id),
				uploadId: String(row.aliyun_upload_id),
			});
		}

		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET status = 'waiting_client_download', phase = 'waiting_client_download', updated_at = ? WHERE id = ?`,
			)
			.run(ts, transferId);
		this.addEvent(transferId, "cli_upload_complete", {});

		if (job.direction === "export") {
			return this.getTransfer(transferId);
		}
		const sent = this.deps.sendToMachine(job.machineId, {
			type: "transfer.download.start",
			requestId: `transfer_${transferId}`,
			payload: { transferId, machineId: job.machineId },
		});
		if (!sent) {
			this.failTransfer(transferId, {
				errorCode: "CLIENT_DISPATCH_FAILED",
				errorMessage: "Client is offline",
			});
			throw new Error("Client is offline");
		}
		return this.getTransfer(transferId);
	}

	async refreshDownloadUrl(
		transferId: string,
	): Promise<{ downloadUrl: string }> {
		const row = this.db
			.prepare(
				`SELECT aliyun_drive_id, aliyun_file_id, size, filename FROM transfer_jobs WHERE id = ?`,
			)
			.get(transferId) as Record<string, unknown> | undefined;
		if (!row) throw new Error("Transfer not found");

		if (isStorageMock()) {
			const content = `noesis-mock-transfer:${transferId}`;
			return {
				downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
			};
		}

		const config = this.aliyunAuth.getConfig();
		const auth = this.aliyunAuth.getAuth();
		if (!config || !auth?.accessToken) {
			throw new Error("Aliyun Drive auth is missing");
		}
		const client = new AliyunDriveOpenApiClient({
			openapiBase: config.openapiBase,
			accessToken: auth.accessToken,
		});
		let lastError: unknown;
		for (let attempt = 1; attempt <= 10; attempt += 1) {
			try {
				const result = await client.getDownloadUrl({
					driveId: String(row.aliyun_drive_id),
					fileId: String(row.aliyun_file_id),
				});
				const downloadUrl = String(
					(result as Record<string, unknown>).download_url ??
						(result as Record<string, unknown>).url ??
						"",
				);
				if (!downloadUrl) throw new Error("Aliyun did not return download_url");
				return { downloadUrl };
			} catch (error) {
				lastError = error;
				const message = error instanceof Error ? error.message : String(error);
				const retryable =
					/InvalidResource\.File|File status is not available/i.test(message);
				if (!retryable || attempt === 10) throw error;
				await new Promise((r) => setTimeout(r, 1000));
			}
		}
		throw lastError instanceof Error ? lastError : new Error(String(lastError));
	}

	completeClientDownload(transferId: string): TransferJobView | null {
		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET status = 'completed', phase = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`,
			)
			.run(ts, ts, transferId);
		this.addEvent(transferId, "client_complete", {});
		return this.getTransfer(transferId);
	}

	failTransfer(
		transferId: string,
		input: { errorCode: string; errorMessage: string },
	): TransferJobView | null {
		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET status = 'failed', phase = 'failed', error_code = ?, error_message = ?, updated_at = ? WHERE id = ?`,
			)
			.run(input.errorCode, input.errorMessage, ts, transferId);
		this.addEvent(transferId, "failed", input);
		return this.getTransfer(transferId);
	}

	recordClientProgress(
		transferId: string,
		progress: Record<string, unknown>,
	): void {
		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET status = 'client_downloading', phase = 'client_downloading',
         downloaded_bytes = COALESCE(?, downloaded_bytes),
         written_bytes = COALESCE(?, written_bytes),
         total_bytes = COALESCE(?, total_bytes),
         updated_at = ? WHERE id = ?`,
			)
			.run(
				progress.downloadedBytes ?? null,
				progress.writtenBytes ?? null,
				progress.totalBytes ?? null,
				ts,
				transferId,
			);
		this.addEvent(transferId, "client_progress", progress);
	}

	async createExportUpload(input: {
		machineId: string;
		rootId?: string;
		path: string;
		filename: string;
		size: number;
	}): Promise<TransferUploadPlan> {
		const plan = await this.createImportUpload({
			...input,
			transfer: "aliyundrive",
		});
		if (plan.mode !== "aliyundrive")
			throw new Error("Export requires aliyundrive");
		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET direction = 'export', status = 'waiting_client_upload', phase = 'waiting_client_upload', updated_at = ? WHERE id = ?`,
			)
			.run(ts, plan.transferId);
		const sent = this.deps.sendToMachine(input.machineId, {
			type: "transfer.upload.start",
			requestId: `transfer_${plan.transferId}`,
			payload: { transferId: plan.transferId, machineId: input.machineId },
		});
		if (!sent) {
			this.failTransfer(plan.transferId, {
				errorCode: "CLIENT_DISPATCH_FAILED",
				errorMessage: "Client is offline",
			});
			throw new Error("Client is offline");
		}
		return plan;
	}

	async getUploadPlan(transferId: string): Promise<TransferUploadPlan> {
		const row = this.db
			.prepare("SELECT * FROM transfer_jobs WHERE id = ?")
			.get(transferId) as Record<string, unknown> | undefined;
		if (!row) throw new Error("Transfer not found");
		const config =
			this.aliyunAuth.getConfig() ??
			this.aliyunAuth.getDefaultConfig({ clientId: "mock-client" });
		const auth = this.aliyunAuth.getAuth();
		const accessToken = isStorageMock()
			? "mock-access-token"
			: auth?.accessToken;
		if (!accessToken) throw new Error("Aliyun Drive auth is missing");
		const driveId = isStorageMock()
			? "mock-drive"
			: String(row.aliyun_drive_id);
		const fileId = isStorageMock()
			? `mock-file-${transferId}`
			: String(row.aliyun_file_id);
		const uploadId = isStorageMock()
			? `mock-upload-${transferId}`
			: String(row.aliyun_upload_id);
		const totalBytes = Number(row.total_bytes ?? row.size);
		const partSize = resolveAliyunPartSize(totalBytes);
		const partCount = Number(row.part_count ?? 1);
		const partInfoList = buildPartInfoList(totalBytes, partSize);
		const remoteParts = isStorageMock()
			? partInfoList.map((p) => ({
					part_number: p.part_number,
					upload_url: `mock://upload/${transferId}/${p.part_number}`,
				}))
			: await this.buildRemoteParts({
					config,
					accessToken,
					driveId,
					fileId,
					uploadId,
					partInfoList,
				});
		return this.planFromRow(
			transferId,
			accessToken,
			config.openapiBase,
			String(row.aliyun_drive_id),
			String(row.aliyun_file_id),
			String(row.aliyun_upload_id),
			partSize,
			partCount,
			totalBytes,
			remoteParts,
		);
	}

	async completeClientExport(
		transferId: string,
	): Promise<TransferJobView | null> {
		if (!isStorageMock()) {
			const row = this.db
				.prepare(
					`SELECT aliyun_drive_id, aliyun_file_id, aliyun_upload_id FROM transfer_jobs WHERE id = ?`,
				)
				.get(transferId) as Record<string, unknown>;
			const config = this.aliyunAuth.getConfig();
			const auth = this.aliyunAuth.getAuth();
			if (!config || !auth?.accessToken) {
				throw new Error("Aliyun Drive auth is missing");
			}
			const client = new AliyunDriveOpenApiClient({
				openapiBase: config.openapiBase,
				accessToken: auth.accessToken,
			});
			await client.completeUpload({
				driveId: String(row.aliyun_drive_id),
				fileId: String(row.aliyun_file_id),
				uploadId: String(row.aliyun_upload_id),
			});
		}
		const ts = nowIso();
		this.db
			.prepare(
				`UPDATE transfer_jobs SET status = 'completed', phase = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`,
			)
			.run(ts, ts, transferId);
		this.addEvent(transferId, "client_export_complete", {});
		return this.getTransfer(transferId);
	}

	private insertJob(fields: {
		transferId: string;
		machineId: string;
		rootId: string;
		targetDir: string;
		filename: string;
		size: number;
		driveId: string;
		fileId: string;
		uploadId: string;
		parentFileId: string;
		aliyunFileName: string;
		partCount: number;
		totalBytes: number;
		direction?: "import" | "export";
	}): void {
		const ts = nowIso();
		const direction = fields.direction ?? "import";
		this.db
			.prepare(
				`INSERT INTO transfer_jobs (
          id, machine_id, direction, root_id, target_dir, filename, size, mode, status, phase,
          aliyun_drive_id, aliyun_file_id, aliyun_upload_id, aliyun_parent_file_id, aliyun_file_name,
          total_bytes, part_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'aliyundrive', 'waiting_cli_upload', 'waiting_cli_upload',
          ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				fields.transferId,
				fields.machineId,
				direction,
				fields.rootId,
				fields.targetDir,
				fields.filename,
				fields.size,
				fields.driveId,
				fields.fileId,
				fields.uploadId,
				fields.parentFileId,
				fields.aliyunFileName,
				fields.totalBytes,
				fields.partCount,
				ts,
				ts,
			);
	}

	private addEvent(transferId: string, eventType: string, data: unknown): void {
		this.db
			.prepare(
				`INSERT INTO transfer_events (id, transfer_id, event_type, data_json, created_at)
         VALUES (?, ?, ?, ?, ?)`,
			)
			.run(
				`tev_${randomUUID()}`,
				transferId,
				eventType,
				JSON.stringify(data),
				nowIso(),
			);
	}

	private rowToView(row: Record<string, unknown>): TransferJobView {
		return {
			id: String(row.id),
			machineId: String(row.machine_id),
			rootId: row.root_id == null ? null : String(row.root_id),
			targetDir: String(row.target_dir),
			filename: String(row.filename),
			size: Number(row.size),
			mode: String(row.mode),
			status: String(row.status),
			direction: String(row.direction ?? "import"),
			uploadedBytes: Number(row.uploaded_bytes),
			downloadedBytes: Number(row.downloaded_bytes),
			writtenBytes: Number(row.written_bytes),
			totalBytes: Number(row.total_bytes),
			errorCode: row.error_code == null ? null : String(row.error_code),
			errorMessage:
				row.error_message == null ? null : String(row.error_message),
		};
	}
}
