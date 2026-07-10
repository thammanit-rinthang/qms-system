export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;

    const nested = record.error;
    if (nested && typeof nested === "object") {
      const nestedRecord = nested as Record<string, unknown>;
      if (typeof nestedRecord.message === "string" && nestedRecord.message.trim()) return nestedRecord.message;
    }
  }

  return fallback;
}

