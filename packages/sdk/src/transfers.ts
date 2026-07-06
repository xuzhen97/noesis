import type { ApiResponse } from "@noesis/shared";
import type { AliyunUploadPlan } from "./aliyun-upload.js";
import { uploadFileToAliyunDrive } from "./aliyun-upload.js";

export type TransferJob = {
	id: string;
	machineId: string;
	status: string;
	direction: string;
	filename: string;
	size: number;
};

export class TransfersApi {
	constructor(
		private readonly baseUrl: string,
		private readonly headers: () => Record<string, string>,
		private readonly readApi: <T>(response: Response) => Promise<T>,
		private readonly fetchImpl: typeof fetch,
	) {}

	async createImportUpload(input: {
		machineId: string;
		path: string;
		filename: string;
		size: number;
		rootId?: string;
	}): Promise<AliyunUploadPlan | { mode: "frps_chunked" }> {
		const response = await this.fetchImpl(
			`${this.baseUrl}/api/transfers/uploads`,
			{
				method: "POST",
				headers: this.headers(),
				body: JSON.stringify({ ...input, transfer: "aliyundrive" }),
			},
		);
		return await this.readApi(response);
	}

	async getTransfer(transferId: string): Promise<TransferJob> {
		return await this.readApi(
			await this.fetchImpl(
				`${this.baseUrl}/api/transfers/${encodeURIComponent(transferId)}`,
				{ headers: this.headers() },
			),
		);
	}

	async waitTransfer(
		transferId: string,
		opts?: { timeoutMs?: number; pollMs?: number },
	): Promise<TransferJob> {
		const deadline = Date.now() + (opts?.timeoutMs ?? 60_000);
		const pollMs = opts?.pollMs ?? 200;
		while (Date.now() < deadline) {
			const job = await this.getTransfer(transferId);
			if (job.status === "completed" || job.status === "failed") return job;
			await new Promise((r) => setTimeout(r, pollMs));
		}
		throw new Error("Transfer wait timeout");
	}

	async refreshDownloadUrl(
		transferId: string,
	): Promise<{ downloadUrl: string }> {
		return await this.readApi(
			await this.fetchImpl(
				`${this.baseUrl}/api/transfers/${encodeURIComponent(transferId)}/refresh-download-url`,
				{ method: "POST", headers: this.headers(), body: "{}" },
			),
		);
	}

	async uploadLocalFile(input: {
		filePath: string;
		machineId: string;
		path: string;
		filename: string;
		size: number;
	}): Promise<string> {
		const plan = await this.createImportUpload({
			machineId: input.machineId,
			path: input.path,
			filename: input.filename,
			size: input.size,
		});
		if (plan.mode !== "aliyundrive") {
			throw new Error("Import upload did not return aliyundrive plan");
		}
		const post = (suffix: string, body: Record<string, unknown>) =>
			this.fetchImpl(
				`${this.baseUrl}/api/transfers/${encodeURIComponent(plan.transferId)}/${suffix}`,
				{
					method: "POST",
					headers: this.headers(),
					body: JSON.stringify(body),
				},
			);
		await uploadFileToAliyunDrive({
			filePath: input.filePath,
			plan,
			serverApi: {
				reportCliProgress: async (_id, progress) => {
					await this.readApi(await post("cli-progress", progress));
				},
				completeCliUpload: async (_id) => {
					await this.readApi(await post("cli-upload-complete", {}));
				},
			},
			fetchImpl: this.fetchImpl,
		});
		return plan.transferId;
	}

	async downloadToFile(transferId: string, outPath: string): Promise<void> {
		const { downloadUrl } = await this.refreshDownloadUrl(transferId);
		const res = await this.fetchImpl(downloadUrl);
		if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
		const buf = Buffer.from(await res.arrayBuffer());
		const { writeFile } = await import("node:fs/promises");
		await writeFile(outPath, buf);
	}
}

export async function readApiResponse<T>(response: Response): Promise<T> {
	const body = (await response.json()) as ApiResponse<T>;
	if (!body.ok) throw new Error(body.error.message);
	return body.data;
}
