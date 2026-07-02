export type NoesisErrorCode =
  | "BAD_REQUEST"
  | "COMMAND_NOT_ALLOWED"
  | "MACHINE_NOT_FOUND"
  | "NOESIS_UNAVAILABLE"
  | "TASK_NOT_FOUND"
  | "TASK_TIMEOUT"
  | "UNSUPPORTED_TASK_TYPE";

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
