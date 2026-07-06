import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

export interface TransferDetail {
	transferId: string;
	machineId: string;
	rootId: string | null;
	targetDir: string;
	filename: string;
	size: number;
	downloadUrl?: string;
}

/**
 * 从 Gateway 拉取中转详情与 download URL，流式写入机器路径。
 */
export async function downloadAliyunTransfer(options: {
	transferId: string;
	machineId: string;
	apiBaseUrl: string;
	ownerToken: string;
	allowedRoots?: string[];
	fetchImpl?: typeof fetch;
	reportProgress?: (payload: Record<string, unknown>) => void | Promise<void>;
	reportComplete?: (payload: Record<string, unknown>) => void | Promise<void>;
	reportFailed?: (payload: Record<string, unknown>) => void | Promise<void>;
}): Promise<void> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const auth = { Authorization: `Bearer ${options.ownerToken}` };
	try {
		const detailRes = await fetchImpl(
			`${options.apiBaseUrl}/api/transfers/${encodeURIComponent(options.transferId)}`,
			{ headers: auth },
		);
		if (!detailRes.ok) {
			throw new Error(`Failed to fetch transfer: HTTP ${detailRes.status}`);
		}
		const wrapped = (await detailRes.json()) as {
			ok: boolean;
			data: TransferDetail;
		};
		const detail = wrapped.data;

		const roots =
			options.allowedRoots?.map((r) => path.resolve(r)) ?? [process.cwd()];
		const rootPath = roots[0];
		const targetDir = path.resolve(
			rootPath,
			detail.targetDir === "." ? "" : detail.targetDir,
		);
		if (!targetDir.startsWith(rootPath + path.sep) && targetDir !== rootPath) {
			throw new Error("Target dir outside allowed root");
		}
		await fsp.mkdir(targetDir, { recursive: true });
		const finalPath = path.join(targetDir, detail.filename);
		const tempPath = path.join(
			targetDir,
			`.noesis-transfer-${options.transferId}.part`,
		);

		let downloadUrl = detail.downloadUrl;
		if (!downloadUrl) {
			const refreshRes = await fetchImpl(
				`${options.apiBaseUrl}/api/transfers/${encodeURIComponent(options.transferId)}/refresh-download-url`,
				{ method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: "{}" },
			);
			if (!refreshRes.ok) {
				throw new Error(`refresh-download-url failed: HTTP ${refreshRes.status}`);
			}
			const refreshBody = (await refreshRes.json()) as {
				ok: boolean;
				data: { downloadUrl: string };
			};
			downloadUrl = refreshBody.data.downloadUrl;
		}

		const response = await fetchImpl(downloadUrl);
		if (!response.ok || !response.body) {
			throw new Error(`Download failed: HTTP ${response.status}`);
		}

		const writable = fs.createWriteStream(tempPath);
		let downloadedBytes = 0;
		let lastReport = 0;
		for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
			downloadedBytes += chunk.length;
			if (!writable.write(chunk)) {
				await new Promise<void>((resolve) => writable.once("drain", () => resolve()));
			}
			if (Date.now() - lastReport > 1000) {
				lastReport = Date.now();
				const progress = {
					transferId: options.transferId,
					machineId: options.machineId,
					phase: "client_downloading",
					downloadedBytes,
					writtenBytes: downloadedBytes,
					totalBytes: detail.size,
				};
				await options.reportProgress?.(progress);
			}
		}
		await new Promise<void>((resolve, reject) =>
			writable.end((err: Error | null | undefined) =>
				err ? reject(err) : resolve(),
			),
		);
		if (fs.existsSync(finalPath)) await fsp.rm(finalPath, { force: true });
		await fsp.rename(tempPath, finalPath);

		const relPath = path.posix.join(
			detail.targetDir === "." ? "" : detail.targetDir.replace(/\\/g, "/"),
			detail.filename,
		);
		const completePayload = {
			transferId: options.transferId,
			machineId: options.machineId,
			rootId: detail.rootId ?? "default",
			path: relPath.replace(/^\//, ""),
			size: detail.size,
		};
		await options.reportComplete?.(completePayload);
	} catch (error) {
		const failedPayload = {
			transferId: options.transferId,
			machineId: options.machineId,
			errorCode: "DOWNLOAD_FAILED",
			errorMessage: error instanceof Error ? error.message : String(error),
		};
		await options.reportFailed?.(failedPayload);
		throw error;
	}
}