import * as fsp from "node:fs/promises";
import * as path from "node:path";
import {
	uploadFileParts,
	type AliyunUploadPlan,
} from "./aliyun-upload-local.js";

/**
 * 导出：读机器本地文件，按 Gateway 下发的 plan 分片上传到盘。
 */
export async function uploadExportTransfer(options: {
	apiBaseUrl: string;
	ownerToken: string;
	transferId: string;
	machineId: string;
	localPath: string;
	allowedRoots?: string[];
	fetchImpl?: typeof fetch;
}): Promise<void> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const auth = {
		Authorization: `Bearer ${options.ownerToken}`,
		"Content-Type": "application/json",
	};
	const planRes = await fetchImpl(
		`${options.apiBaseUrl}/api/transfers/${encodeURIComponent(options.transferId)}/upload-plan`,
		{ headers: auth },
	);
	if (!planRes.ok) {
		throw new Error(`upload-plan failed: HTTP ${planRes.status}`);
	}
	const wrapped = (await planRes.json()) as {
		ok: boolean;
		data: AliyunUploadPlan;
	};
	const plan = wrapped.data;

	const roots = options.allowedRoots?.map((r) => path.resolve(r)) ?? [
		process.cwd(),
	];
	const filePath = path.resolve(roots[0], options.localPath);
	if (!filePath.startsWith(roots[0] + path.sep) && filePath !== roots[0]) {
		throw new Error("Path outside allowed root");
	}
	await fsp.access(filePath);

	const post = (suffix: string, body: Record<string, unknown>) =>
		fetchImpl(
			`${options.apiBaseUrl}/api/transfers/${encodeURIComponent(options.transferId)}/${suffix}`,
			{ method: "POST", headers: auth, body: JSON.stringify(body) },
		);

	try {
		await uploadFileParts({
			filePath,
			plan,
			onProgress: (input) => post("cli-progress", input).then(() => {}),
			onComplete: () => post("client-export-complete", {}).then(() => {}),
			fetchImpl,
		});
	} catch (error) {
		await post("client-failed", {
			transferId: options.transferId,
			machineId: options.machineId,
			errorCode: "UPLOAD_FAILED",
			errorMessage: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
