/**
 * Hệ thống ghi nhật ký cảnh báo và đo kiểm (Telemetry & Warning Logger)
 * Đảm bảo ghi nhận chuẩn tắc khi hệ thống chuyển sang Fallback / Offline
 * Tuân thủ quy tắc trung thực kỹ thuật theo AGENTS.md
 */

export interface SystemWarningPayload {
  context: string;
  operation: string;
  reason: string;
  error?: any;
  timestamp?: string;
}

export function logSystemWarning(
  contextOrPayload: string | SystemWarningPayload,
  operation?: string,
  reason?: string,
  error?: any
) {
  let payload: SystemWarningPayload;

  if (typeof contextOrPayload === "object" && contextOrPayload !== null) {
    payload = {
      ...contextOrPayload,
      timestamp: contextOrPayload.timestamp || new Date().toISOString(),
    };
  } else {
    payload = {
      context: String(contextOrPayload || "SYSTEM"),
      operation: String(operation || "UNKNOWN_OPERATION"),
      reason: String(reason || "Unspecified reason"),
      error: error ? (error.message || String(error)) : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  // Định dạng structured warning log
  const formattedError = payload.error ? ` | Error: ${payload.error}` : "";
  console.warn(
    `[TELEMETRY_WARN] [${payload.timestamp}] [${payload.context}] [${payload.operation}] Reason: ${payload.reason}${formattedError}`
  );

  return payload;
}
