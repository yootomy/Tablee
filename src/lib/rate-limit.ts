import { prisma } from "@/lib/prisma";
import { ensureOperationalSchema } from "@/lib/app-schema";

export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  message?: string;
};

export function getRateLimitWindowStart(now: Date, windowMs: number) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export async function assertRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
  message,
}: RateLimitOptions) {
  if (!identifier.trim()) {
    return;
  }

  await ensureOperationalSchema();

  const now = new Date();
  const windowStart = getRateLimitWindowStart(now, windowMs);
  const result = await prisma.$queryRaw<Array<{ hit_count: number }>>`
    INSERT INTO request_rate_limits (
      scope,
      identifier,
      window_start,
      hit_count,
      last_hit_at,
      updated_at
    )
    VALUES (
      ${scope},
      ${identifier},
      ${windowStart},
      1,
      ${now},
      ${now}
    )
    ON CONFLICT (scope, identifier, window_start)
    DO UPDATE SET
      hit_count = request_rate_limits.hit_count + 1,
      last_hit_at = EXCLUDED.last_hit_at,
      updated_at = EXCLUDED.updated_at
    RETURNING hit_count;
  `;

  const hitCount = result[0]?.hit_count ?? 1;

  if (hitCount > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000),
    );

    throw new RateLimitExceededError(
      message ?? "Trop de tentatives, réessaie un peu plus tard.",
      retryAfterSeconds,
    );
  }
}
