const TRANSIENT_DB_ERROR_NAMES = new Set([
  "SequelizeConnectionError",
  "SequelizeConnectionAcquireTimeoutError",
  "SequelizeHostNotReachableError",
  "SequelizeTimeoutError",
  "ConnectionError",
  "ConnectionAcquireTimeoutError",
]);

const TRANSIENT_DB_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "57P01",
  "57P02",
  "57P03",
]);

function extractErrorCode(error) {
  return error?.original?.code || error?.parent?.code || error?.code || null;
}

export function isTransientDbError(error) {
  if (!error) return false;
  const name = String(error.name || "");
  const code = extractErrorCode(error);
  const message = String(error.message || "");

  if (TRANSIENT_DB_ERROR_NAMES.has(name)) return true;
  if (code && TRANSIENT_DB_ERROR_CODES.has(String(code))) return true;

  return /SequelizeConnection|ConnectionAcquireTimeout|TLS connection|Connection terminated unexpectedly|read ECONNRESET|Operation timeout/i.test(
    message,
  );
}

export function getHttpStatusForError(error) {
  if (isTransientDbError(error)) return 503;
  const status = Number(error?.status || error?.statusCode);
  return Number.isFinite(status) && status > 0 ? status : 500;
}

export function getPublicErrorMessage(error, fallback) {
  if (isTransientDbError(error)) {
    return "Service temporarily unavailable";
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry(task, options = {}) {
  const attempts = Math.max(1, Number.parseInt(String(options.attempts ?? 2), 10) || 2);
  const baseDelayMs = Math.max(0, Number.parseInt(String(options.baseDelayMs ?? 150), 10) || 150);
  const label = options.label ? String(options.label) : "Database operation";

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt >= attempts) {
        throw error;
      }
      console.warn(`${label} failed (${attempt}/${attempts}):`, error?.message || error);
      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError;
}
