import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { RequestSecurityError, securityErrorResponse } from "./errors";

export function positiveIntegerSetting(name: string, fallback: number, maximum: number) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RequestSecurityError("La protección de solicitudes no está disponible. Probá más tarde.", 503, 60);
  }
  return value;
}

export function getRateLimitBucketStart(now: number, windowMs: number) {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

export function clientNetwork(request: Request) {
  // On Vercel this header is overwritten by its edge. Never fall back to an
  // arbitrary client-provided X-Forwarded-For. Local callers share one bucket.
  if (process.env.VERCEL !== "1") return "local";
  const value = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!value || !isIP(value)) {
    throw new RequestSecurityError("No se pudo verificar la conexión. Probá más tarde.", 503, 60);
  }
  if (isIP(value) === 4) return value;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const [left, right] = normalized.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const parts = right === undefined ? head : [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail];
  const words = parts.map(part => parseInt(part, 16));
  if (words.slice(0, 5).every(word => word === 0) && words[5] === 65535) {
    return [words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join(".");
  }
  // IPv6 privacy addresses in the same /64 must not create fresh quotas.
  return words.slice(0, 4).map(word => word.toString(16)).join(":") + "::/64";
}

let nextCleanupAt = 0;
async function cleanupExpired(now: number) {
  if (now < nextCleanupAt) return;
  nextCleanupAt = now + 60_000;
  try {
    const expired = await prisma.anonymousRateLimit.findMany({
      where: { expiresAt: { lte: new Date(now) } },
      orderBy: { expiresAt: "asc" }, take: 100, select: { id: true },
    });
    if (expired.length) await prisma.anonymousRateLimit.deleteMany({
      where: { id: { in: expired.map(row => row.id) }, expiresAt: { lte: new Date(now) } },
    });
  } catch {
    // Cleanup is best effort; it must not disable the actual quota check.
    console.warn("No se pudieron limpiar contadores vencidos de solicitudes.");
  }
}

export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number) {
  const secret = process.env.ANONYMOUS_RATE_LIMIT_SECRET;
  if (!secret) throw new RequestSecurityError("La protección de solicitudes no está disponible. Probá más tarde.", 503, 60);
  const now = Date.now();
  const bucketStart = getRateLimitBucketStart(now, windowMs);
  // Window-scoped HMAC: no raw IP, account id, browser string or stable tracking id.
  const fingerprintHash = createHmac("sha256", secret)
    .update(JSON.stringify([scope, bucketStart.getTime(), identity])).digest("hex");
  const key = { fingerprintHash, bucketStart };
  let bucket;
  try {
    await cleanupExpired(now);
    try {
      bucket = await prisma.anonymousRateLimit.upsert({
        where: { fingerprintHash_bucketStart: key },
        update: { count: { increment: 1 } },
        create: { ...key, expiresAt: new Date(bucketStart.getTime() + windowMs * 2) },
        select: { count: true },
      });
    } catch (error) {
      // Also safe if Prisma emulates upsert and two instances create together.
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
      bucket = await prisma.anonymousRateLimit.update({
        where: { fingerprintHash_bucketStart: key }, data: { count: { increment: 1 } }, select: { count: true },
      });
    }
  } catch {
    throw new RequestSecurityError("La protección de solicitudes no está disponible. Probá más tarde.", 503, 60);
  }
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucketStart.getTime() + windowMs - now) / 1000));
    throw new RequestSecurityError(`Demasiadas solicitudes. Probá de nuevo en ${retryAfter} segundos.`, 429, retryAfter);
  }
}

export async function checkReadRateLimit(request: Request) {
  try {
    if (request.url.length > 8192) throw new RequestSecurityError("La búsqueda es demasiado grande.", 414);
    const limit = positiveIntegerSetting("PUBLIC_API_RATE_LIMIT_MAX", 120, 10_000);
    await consumeRateLimit("public-api", clientNetwork(request), limit, 60_000);
    return null;
  } catch (error) {
    return securityErrorResponse(error) ?? securityErrorResponse(new RequestSecurityError("No se pudo procesar la solicitud. Probá más tarde.", 503, 60));
  }
}

export async function consumeUploadRateLimit(userId: string) {
  const limit = positiveIntegerSetting("UPLOAD_RATE_LIMIT_MAX", 10, 1000);
  await consumeRateLimit("upload", userId, limit, 600_000);
}
