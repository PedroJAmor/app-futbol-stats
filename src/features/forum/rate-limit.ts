import { createHmac } from "node:crypto";
import { clientNetwork, consumeRateLimit, positiveIntegerSetting } from "@/features/security/rate-limit";
export { getRateLimitBucketStart } from "@/features/security/rate-limit";

export function hashAnonymousFingerprint(ip: string, userAgent: string, secret: string) {
  return createHmac("sha256", secret).update(`${ip}|${userAgent}`).digest("hex");
}

export async function consumeAnonymousRateLimit(request: Request) {
  const windowMs = positiveIntegerSetting("ANONYMOUS_RATE_LIMIT_WINDOW_MS", 600_000, 86_400_000);
  const limit = positiveIntegerSetting("ANONYMOUS_RATE_LIMIT_MAX", 5, 1000);
  const networkLimit = positiveIntegerSetting("ANONYMOUS_RATE_LIMIT_NETWORK_MAX", 50, 10_000);
  const network = clientNetwork(request);
  // Shared Wi-Fi gets a larger aggregate quota. Changing User-Agent no longer
  // bypasses that ceiling. Neither identity is attached to a forum post.
  await consumeRateLimit("forum-network", network, networkLimit, windowMs);
  await consumeRateLimit("forum-browser", JSON.stringify([network, request.headers.get("user-agent")?.slice(0, 512) ?? "unknown"]), limit, windowMs);
}
