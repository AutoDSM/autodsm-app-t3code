/**
 * Best-effort user-facing text for values thrown from Effect `runPromise` / RPC clients.
 */
export function formatUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const msg = record.message;
    if (typeof msg === "string" && msg.trim().length > 0) {
      return msg.trim();
    }
    const failure = record.failure;
    if (typeof failure === "object" && failure !== null && "message" in failure) {
      const m = (failure as { message?: unknown }).message;
      if (typeof m === "string" && m.trim().length > 0) {
        return m.trim();
      }
    }
    const cause = record.cause;
    if (cause !== undefined && cause !== error) {
      const nested = formatUnknownErrorMessage(cause);
      if (nested.length > 0) {
        return nested;
      }
    }
    try {
      const encoded = JSON.stringify(record);
      if (encoded.length > 0 && encoded !== "{}") {
        return encoded.length > 400 ? `${encoded.slice(0, 400)}…` : encoded;
      }
    } catch {
      // fall through
    }
  }
  const asString = String(error);
  return asString !== "[object Object]" ? asString : "Workspace creation failed. Please retry.";
}
