import type { GatewayInfo } from "@noesis/shared";

/** Gateway API 错误分类 */
export type GatewayApiError =
	| { kind: "unauthorized" }
	| { kind: "unreachable" }
	| { kind: "server-error"; message: string };

/**
 * 使用 Owner Token 请求 Gateway info 端点。
 * 成功返回 GatewayInfo；失败返回分类后的错误。
 */
export async function getGatewayInfo(
	ownerToken: string,
): Promise<GatewayInfo | GatewayApiError> {
	try {
		const response = await fetch("/api/gateway/info", {
			headers: { authorization: `Bearer ${ownerToken}` },
		});

		if (response.status === 401) {
			return { kind: "unauthorized" };
		}

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			const message =
				typeof body?.error?.message === "string"
					? body.error.message
					: "Unknown error";
			return { kind: "server-error", message };
		}

		const body = await response.json();
		if (body?.ok === true && body.data !== undefined) {
			return body.data as GatewayInfo;
		}

		return { kind: "server-error", message: "Unexpected Gateway response" };
	} catch {
		return { kind: "unreachable" };
	}
}
