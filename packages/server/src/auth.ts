import { timingSafeEqual } from "node:crypto";

/** 解析启动参数和环境变量中的 Owner Token。返回 trim 后的 token 或 null。 */
export function readOwnerTokenFromEnv(args: readonly string[]): string | null {
	const flagIndex = args.indexOf("--owner-token");
	if (flagIndex !== -1) {
		const value = args[flagIndex + 1];
		if (value === undefined) {
			throw new Error("--owner-token requires a value");
		}
		return value.trim();
	}
	const env = process.env.NOESIS_OWNER_TOKEN?.trim();
	if (env && env.length > 0) return env;
	return null;
}

/**
 * 从 HTTP 请求的 Authorization header 提取 Bearer token。
 * 返回 token 字符串或 null。
 */
export function readBearerToken(
	authorization: string | undefined,
): string | null {
	if (authorization === undefined) return null;
	const match = authorization.match(/^Bearer\s+(.+)$/i);
	if (match === null) return null;
	const token = match[1].trim();
	return token.length === 0 ? null : token;
}

/**
 * 常量时间比较两个 token。长度不同直接失败；长度相同用 timingSafeEqual。
 */
export function ownerTokenEquals(expected: string, actual: string): boolean {
	if (expected.length !== actual.length) return false;
	return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
