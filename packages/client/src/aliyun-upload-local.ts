import * as fs from "node:fs/promises";

export interface AliyunUploadPlan {
	mode: "aliyundrive";
	transferId: string;
	partSize: number;
	partCount: number;
	uploadParts: Array<{ partNumber: number; uploadUrl: string; size: number }>;
}

/** Client 导出分片上传（mock:// 跳过 PUT）。 */
export async function uploadFileParts(options: {
	filePath: string;
	plan: AliyunUploadPlan;
	onProgress: (input: Record<string, unknown>) => Promise<void>;
	onComplete: () => Promise<void>;
	fetchImpl?: typeof fetch;
}): Promise<void> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const stat = await fs.stat(options.filePath);
	const file = await fs.open(options.filePath, "r");
	let uploadedBytes = 0;
	try {
		for (
			let partNumber = 1;
			partNumber <= options.plan.partCount;
			partNumber += 1
		) {
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
			if (!part.uploadUrl.startsWith("mock://")) {
				const response = await fetchImpl(part.uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": "" },
					body: buffer,
				});
				if (!response.ok) {
					throw new Error(
						`PUT part ${partNumber} failed: HTTP ${response.status}`,
					);
				}
			}
			uploadedBytes += part.size;
			await options.onProgress({
				uploadedBytes,
				totalBytes: stat.size,
				currentPart: partNumber,
			});
		}
		await options.onComplete();
	} finally {
		await file.close();
	}
}
