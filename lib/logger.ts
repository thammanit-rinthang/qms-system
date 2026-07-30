type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function toErrorMeta(error: unknown): LogMeta {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }
  return { errorValue: error };
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
const payload = {
  timestamp: new Date().toISOString(),
  level,
  service: process.env.APP_NAME ?? "qms-system",
  message,
  ...meta,
};
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    write("debug", message, meta);
  },
  info(message: string, meta?: LogMeta): void {
    write("info", message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    write("warn", message, meta);
  },
  error(message: string, error?: unknown, meta?: LogMeta): void {
    write("error", message, {
      ...meta,
      ...(error !== undefined ? toErrorMeta(error) : {}),
    });
  },
};
