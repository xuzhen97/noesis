export type NoesisErrorCode = "NOESIS_UNAVAILABLE" | "UNSUPPORTED_TASK_TYPE";

export interface NoesisErrorShape {
  code: NoesisErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createNoesisError(
  code: NoesisErrorCode,
  message: string,
  details?: Record<string, unknown>,
): NoesisErrorShape {
  return details === undefined ? { code, message } : { code, message, details };
}
