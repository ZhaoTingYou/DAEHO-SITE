export type LoginRateLimitKeys = {ip: string; username: string};

export function createLoginRateLimiter(options?: {
  windowMs?: number;
  ipLimit?: number;
  usernameLimit?: number;
  maxBuckets?: number;
}): {
  reserve(keys: LoginRateLimitKeys, now?: number): boolean;
  releaseSuccessful(keys: LoginRateLimitKeys): void;
};
