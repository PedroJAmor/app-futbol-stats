import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = Number(process.env.ANONYMOUS_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000);
const LIMIT = Number(process.env.ANONYMOUS_RATE_LIMIT_MAX ?? 5);

export function hashAnonymousFingerprint(ip: string, userAgent: string, secret: string) {
  return createHmac("sha256", secret).update(`${ip}|${userAgent}`).digest("hex");
}

export function getRateLimitBucketStart(now: number, windowMs = WINDOW_MS) {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

function fingerprint(request: NextRequest) {
  const secret = process.env.ANONYMOUS_RATE_LIMIT_SECRET;
  if (!secret) throw new Error("ANONYMOUS_RATE_LIMIT_SECRET no está configurado");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return hashAnonymousFingerprint(forwarded, userAgent, secret);
}

export async function consumeAnonymousRateLimit(request: NextRequest) {
  const now = Date.now();
  const bucketStart = getRateLimitBucketStart(now);
  const expiresAt = new Date(bucketStart.getTime() + WINDOW_MS * 2);
  const fingerprintHash = fingerprint(request);

  const bucket = await prisma.anonymousRateLimit.upsert({
    where: { fingerprintHash_bucketStart: { fingerprintHash, bucketStart } },
    update: { count: { increment: 1 }, expiresAt },
    create: { fingerprintHash, bucketStart, expiresAt },
  });
  if (bucket.count > LIMIT) throw new Error("RATE_LIMITED");
}
