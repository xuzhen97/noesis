/** Noesis 预定义错误码，用于 Gateway ↔ 客户端的稳定错误标识 */
export type NoesisErrorCode =
	| "BAD_REQUEST"
	| "COMMAND_NOT_ALLOWED"
	| "INVALID_OWNER_TOKEN"
	| "MACHINE_NOT_FOUND"
	| "NOESIS_UNAVAILABLE"
	| "OWNER_TOKEN_REQUIRED"
	| "TASK_NOT_FOUND"
	| "TASK_TIMEOUT"
	| "UNSUPPORTED_TASK_TYPE";

/** Noesis 错误对象结构：包含稳定 code 和安全 message，不泄露内部信息 */
export interface NoesisErrorShape {
	code: NoesisErrorCode;
	message: string;
	details?: Record<string, unknown>;
}

/**
 * 创建带有稳定错误码和安全消息的 Noesis 错误对象。
 * 不暴露 stack、密钥或内部文件路径。
 */
export function createNoesisError(
	code: NoesisErrorCode,
	message: string,
	details?: Record<string, unknown>,
): NoesisErrorShape {
	return details === undefined ? { code, message } : { code, message, details };
}
