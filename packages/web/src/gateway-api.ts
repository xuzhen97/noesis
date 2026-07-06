import type { DiskInfo, GatewayInfo, Machine } from "@noesis/shared";

/** Gateway API 错误分类 */
export type GatewayApiError =
	| { kind: "unauthorized" }
	| { kind: "unreachable" }
	| { kind: "server-error"; message: string };

export function formatApiError(err: GatewayApiError): string {
	if (err.kind === "server-error") return err.message;
	if (err.kind === "unauthorized") return "未授权";
	return "无法连接 Gateway";
}

async function apiFetch<T>(
	ownerToken: string,
	path: string,
	init?: RequestInit,
): Promise<T | GatewayApiError> {
	try {
		const response = await fetch(path, {
			...init,
			headers: {
				authorization: `Bearer ${ownerToken}`,
				"content-type": "application/json",
				...init?.headers,
			},
		});
		if (response.status === 401) return { kind: "unauthorized" };
		const body = await response.json().catch(() => ({}));
		if (!response.ok || body?.ok !== true) {
			const message =
				typeof body?.error?.message === "string"
					? body.error.message
					: `HTTP ${response.status}`;
			return { kind: "server-error", message };
		}
		return body.data as T;
	} catch {
		return { kind: "unreachable" };
	}
}

/**
 * 使用 Owner Token 请求 Gateway info 端点。
 */
export async function getGatewayInfo(
	ownerToken: string,
): Promise<GatewayInfo | GatewayApiError> {
	return apiFetch<GatewayInfo>(ownerToken, "/api/gateway/info");
}

export type AliyunDriveStatus = {
	configured: boolean;
	authorized: boolean;
	authorizationState: string;
	mock?: boolean;
	clientId?: string;
	transferFolder?: string;
	expiresAt?: number;
	checkedAt?: number;
	driveId?: string;
	authorizedAccountName?: string;
};

export type AliyunDriveTestResult = {
	state: string;
	message: string;
	checkedAt: number;
	driveId?: string;
	authorizedAccountName?: string;
};

export async function getAliyunStatus(
	ownerToken: string,
): Promise<AliyunDriveStatus | GatewayApiError> {
	return apiFetch<AliyunDriveStatus>(ownerToken, "/api/aliyundrive/status");
}

export async function putAliyunConfig(
	ownerToken: string,
	input: { clientId: string; clientSecret?: string; transferFolder?: string },
): Promise<{ configured: boolean; clientId: string } | GatewayApiError> {
	return apiFetch(ownerToken, "/api/aliyundrive/config", {
		method: "PUT",
		body: JSON.stringify(input),
	});
}

export async function startAliyunOAuth(
	ownerToken: string,
): Promise<
	| { state: string; authorizationUrl: string; expiresAt: number }
	| GatewayApiError
> {
	return apiFetch(ownerToken, "/api/aliyundrive/oauth/start", {
		method: "POST",
		body: "{}",
	});
}

export async function completeAliyunOAuth(
	ownerToken: string,
	input: { state: string; code: string },
): Promise<AliyunDriveStatus | GatewayApiError> {
	return apiFetch(ownerToken, "/api/aliyundrive/oauth/complete", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function testAliyun(
	ownerToken: string,
): Promise<AliyunDriveTestResult | GatewayApiError> {
	return apiFetch(ownerToken, "/api/aliyundrive/test", {
		method: "POST",
		body: "{}",
	});
}

export async function listMachines(
	ownerToken: string,
): Promise<Machine[] | GatewayApiError> {
	return apiFetch<Machine[]>(ownerToken, "/api/machines");
}

export async function getMachine(
	ownerToken: string,
	machineId: string,
): Promise<Machine | GatewayApiError> {
	return apiFetch<Machine>(
		ownerToken,
		`/api/machines/${encodeURIComponent(machineId)}`,
	);
}

export type FileListEntry = {
	name: string;
	path: string;
	kind: "file" | "directory";
	size?: number;
};

export async function fileList(
	ownerToken: string,
	input: { machineId: string; path: string },
): Promise<{ entries: FileListEntry[] } | GatewayApiError> {
	return apiFetch(ownerToken, "/api/files/list", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function fileWrite(
	ownerToken: string,
	input: {
		machineId: string;
		path: string;
		content: string;
		encoding?: "utf8" | "base64";
	},
): Promise<{ path: string; size: number } | GatewayApiError> {
	return apiFetch(ownerToken, "/api/files/write", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export type TransferJob = {
	id: string;
	machineId: string;
	status: string;
	direction: string;
	filename: string;
	size: number;
};

export async function createTransferImport(
	ownerToken: string,
	input: {
		machineId: string;
		path: string;
		filename: string;
		size: number;
	},
): Promise<
	| {
			mode: "aliyundrive";
			transferId: string;
			uploadParts: Array<{
				partNumber: number;
				uploadUrl: string;
				size: number;
			}>;
	  }
	| { mode: "frps_chunked" }
	| GatewayApiError
> {
	return apiFetch(ownerToken, "/api/transfers/uploads", {
		method: "POST",
		body: JSON.stringify({ ...input, transfer: "aliyundrive" }),
	});
}

export async function getTransfer(
	ownerToken: string,
	transferId: string,
): Promise<TransferJob | GatewayApiError> {
	return apiFetch(
		ownerToken,
		`/api/transfers/${encodeURIComponent(transferId)}`,
	);
}

export async function refreshDownloadUrl(
	ownerToken: string,
	transferId: string,
): Promise<{ downloadUrl: string } | GatewayApiError> {
	return apiFetch(
		ownerToken,
		`/api/transfers/${encodeURIComponent(transferId)}/refresh-download-url`,
		{ method: "POST", body: "{}" },
	);
}

export type { DiskInfo };
