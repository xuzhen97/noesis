import * as fs from "node:fs/promises";

export interface AliyunUploadPlan {
	mode: "aliyundrive";
	transferId: string;
	accessToken: string;
	openapiBase: string;
	driveId: string;
	fileId: string;
	uploadId: string;
	partSize: number;
	partCount: number;
	uploadParts: Array<{ partNumber: number; uploadUrl: string; size: number }>;
}

/** mock:// 或真实 URL 分片 PUT；mock 分片不访问网络。 */
export async function uploadFileToAliyunDrive(options: {
	filePath: string;
	plan: AliyunUploadPlan;
	serverApi: {
		reportCliProgress(
			transferId: string,
			input: Record<string, unknown>,
		): Promise<unknown>;
		completeCliUpload(transferId: string): Promise<unknown>;
	};
	fetchImpl?: typeof fetch;
}): Promise<void> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const stat = await fs.stat(options.filePath);
	const file = await fs.open(options.filePath, "r");
	let uploadedBytes = 0;
	try {
		for (let partNumber = 1; partNumber <= options.plan.partCount; partNumber += 1) {
			const part = options.plan.uploadParts.find(
				(p) => p.partNumber === partNumber,
			);
			if (!part) throw new Error(`Missing upload part ${partNumber}`);
			const offset = (partNumber - 1) * options.plan.partSize;
			const buffer = Buffer.alloc(part.size);
			const { bytesRead } = await file.read(buffer, 0, part.size, offset);
			if (bytesRead !== part.size) {
				throw new Error(`Short read at part ${partNumber}`);
			}
			if (part.uploadUrl.startsWith("mock://")) {
				// ponytail: skip PUT in mock mode
			} else {
				const response = await fetchImpl(part.uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": "" },
					body: buffer,
				});
				if (!response.ok) {
					throw new Error(`PUT part ${partNumber} failed: HTTP ${response.status}`);
				}
			}
			uploadedBytes += part.size;
			await options.serverApi.reportCliProgress(options.plan.transferId, {
				uploadedBytes,
				totalBytes: stat.size,
				currentPart: partNumber,
			});
		}
		await options.serverApi.completeCliUpload(options.plan.transferId);
	} finally {
		await file.close();
	}
}