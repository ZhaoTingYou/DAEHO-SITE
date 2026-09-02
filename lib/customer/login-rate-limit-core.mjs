export function createLoginRateLimiter({
  windowMs = 15 * 60 * 1000,
  ipLimit = 20,
  usernameLimit = 10,
  maxBuckets = 5_000
} = {}) {
  const buckets = new Map();

  return {
    reserve(keys, now = Date.now()) {
      prune(now);
      const ipKey = `ip:${keys.ip}`;
      const usernameKey = `username:${keys.username}`;
      if (reached(ipKey, ipLimit, now) || reached(usernameKey, usernameLimit, now)) {
        return false;
      }
      increment(ipKey, now);
      increment(usernameKey, now);
      if (buckets.size > maxBuckets) prune(now, true);
      return true;
    },

    releaseSuccessful(keys) {
      decrement(`ip:${keys.ip}`);
      buckets.delete(`username:${keys.username}`);
    }
  };

  function reached(key, limit, now) {
    const bucket = buckets.get(key);
    return Boolean(bucket && bucket.resetAt > now && bucket.count >= limit);
  }

  function increment(key, now) {
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, {count: 1, resetAt: now + windowMs});
    } else {
      current.count += 1;
    }
  }

  function decrement(key) {
    const current = buckets.get(key);
    if (!current || current.count <= 1) buckets.delete(key);
    else current.count -= 1;
  }

  function prune(now, trim = false) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now || (trim && buckets.size > maxBuckets)) buckets.delete(key);
    }
  }
}
