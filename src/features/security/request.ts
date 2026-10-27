import { RequestSecurityError } from "./errors";

/** Browser writes must come from this exact origin, including port and scheme.
 * OAuth is handled separately by NextAuth and must not use this guard. */
export function assertSameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") {
    throw new RequestSecurityError("La solicitud debe realizarse desde la aplicación.", 403);
  }
  const url = new URL(request.url);
  // Host is the browser's destination, not X-Forwarded-Host supplied by a client.
  const host = request.headers.get("host") ?? url.host;
  const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
  let target: URL;
  try {
    target = new URL(`${protocol}//${host}`);
    if (target.host.toLowerCase() !== host.toLowerCase() || target.username || target.password) throw new Error();
  } catch {
    throw new RequestSecurityError("Destino de solicitud inválido.", 403);
  }
  const origin = request.headers.get("origin");
  const source = origin ?? request.headers.get("referer");
  // Reject absent/null origins too. Non-browser clients can send an explicit Origin.
  try {
    if (!source) throw new Error();
    const parsed = new URL(source);
    if (parsed.origin !== target.origin || parsed.username || parsed.password ||
        (origin !== null && origin !== parsed.origin)) throw new Error();
  } catch {
    throw new RequestSecurityError("La solicitud debe realizarse desde la aplicación.", 403);
  }
}

/** Enforce bytes while streaming, even without/trusting no Content-Length. */
export async function readJsonBody(request: Request, maxBytes = 32 * 1024): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new RequestSecurityError("La solicitud debe enviarse como JSON.", 415);
  }
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new RequestSecurityError("La solicitud es demasiado grande.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestSecurityError("El cuerpo de la solicitud no es válido.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestSecurityError("La solicitud es demasiado grande.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestSecurityError("El cuerpo de la solicitud no es válido.", 400);
  }
}
