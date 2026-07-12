export interface RetryPolicy { maxAttempts: number; baseDelayMs: number; maxDelayMs: number }
export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxAttempts: 4, baseDelayMs: 1_000, maxDelayMs: 30_000 };
export const retryDelayMs = (attempts: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY) =>
  Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempts - 1));
