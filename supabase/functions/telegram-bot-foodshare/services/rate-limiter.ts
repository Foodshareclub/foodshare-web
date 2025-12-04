/**
 * Rate limiting service to prevent abuse
 */

interface RateLimit {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<number, RateLimit>();

export function checkRateLimit(userId: number, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

export function getRemainingRequests(userId: number, maxRequests = 10): number {
  const userLimit = rateLimits.get(userId);
  if (!userLimit || Date.now() > userLimit.resetAt) {
    return maxRequests;
  }
  return Math.max(0, maxRequests - userLimit.count);
}

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [userId, limit] of rateLimits.entries()) {
      if (now > limit.resetAt) {
        rateLimits.delete(userId);
      }
    }
  },
  5 * 60 * 1000
);
