/**
 * Server-Side Request Idempotency Safeguard
 * Prevents duplicate processing of high-stakes mutating operations
 * (Registration, Fee Payments, Report Card Bulk Queueing, Promotion).
 */

interface IdempotencyRecord {
  result: any;
  status: "in_progress" | "completed" | "failed";
  timestamp: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

// Expiry window: 10 minutes (600,000 ms)
const EXPIRY_MS = 10 * 60 * 1000;

export class DuplicateRequestError extends Error {
  constructor(message = "Duplicate request in progress or already processed") {
    super(message);
    this.name = "DuplicateRequestError";
  }
}

/**
 * Executes a mutating action with guaranteed server-side idempotency
 * @param idempotencyKey Unique key per action (e.g. from X-Idempotency-Key header or generated per submission)
 * @param action The async mutation function
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  action: () => Promise<T>
): Promise<T> {
  if (!idempotencyKey) {
    // If no key provided, execute action directly
    return action();
  }

  // Cleanup expired keys periodically
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > EXPIRY_MS) {
      idempotencyStore.delete(key);
    }
  }

  const existing = idempotencyStore.get(idempotencyKey);

  if (existing) {
    if (existing.status === "completed") {
      return existing.result as T;
    }
    if (existing.status === "in_progress") {
      throw new DuplicateRequestError(
        "A request with this idempotency key is currently in progress."
      );
    }
  }

  // Mark in progress
  idempotencyStore.set(idempotencyKey, {
    result: null,
    status: "in_progress",
    timestamp: now,
  });

  try {
    const result = await action();
    idempotencyStore.set(idempotencyKey, {
      result,
      status: "completed",
      timestamp: Date.now(),
    });
    return result;
  } catch (error) {
    // On error, remove the key so user can retry safely
    idempotencyStore.delete(idempotencyKey);
    throw error;
  }
}

/**
 * Resets the in-memory idempotency cache (useful for automated testing)
 */
export function _resetIdempotencyStore() {
  idempotencyStore.clear();
}
