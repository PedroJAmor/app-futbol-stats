import { consumeUploadRateLimit } from "@/features/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { securityErrorResponse } from "@/features/security/errors";
// src/app/api/upload/route.ts
// POST /api/upload
// Recibe una imagen en base64 y la sube a Cloudinary
// Devuelve la URL pública de la imagen
// Solo accesible por admin

import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorStatus } from "@/features/auth/session";
import { ImageInputError, validateImageData } from "@/features/auth/upload-image";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("ADMIN");
    const input = await readJsonBody(req, 7 * 1024 * 1024);
    const imagen = validateImageData((input as { imagen?: unknown } | null)?.imagen);
    await consumeUploadRateLimit(actor.id);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary no está configurado" },
        { status: 500 }
      );
    }

    // Subir a Cloudinary via API REST (sin SDK para no agregar dependencias)
    const timestamp = Math.floor(Date.now() / 1000);

    // Firma Cloudinary por defecto: sha1(folder=jugadores&timestamp=...&api_secret)
    const crypto = await import("crypto");
    const toSign = `folder=jugadores&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(toSign)
      .digest("hex");

    const formData = new FormData();
    formData.append("file", imagen); // base64 con prefijo data:image/...
    formData.append("folder", "jugadores");
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData, signal: AbortSignal.timeout(20_000) }
    );

    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      const disabledKey = typeof failure?.error?.message === "string" && /disabled api_key/i.test(failure.error.message);
      // Never forward provider errors: they can contain API keys or signatures.
      const message = disabledKey
        ? "La clave de Cloudinary está deshabilitada. Habilitala o configurá una clave activa."
        : response.status === 401 || response.status === 403
          ? "Cloudinary rechazó las credenciales. Revisá la configuración de la cuenta."
          : "Cloudinary no pudo subir la imagen. Volvé a intentar.";
      return NextResponse.json(
        { error: message },
        { status: disabledKey || response.status === 401 || response.status === 403 ? 503 : 502 }
      );
    }

    const data = await response.json();
    if (typeof data.secure_url !== "string" || !data.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)) throw new Error("INVALID_UPLOAD_RESPONSE");

    // Devolver la URL con transformación: 400x400, recortado al centro
    const urlOptimizada = data.secure_url.replace(
      "/upload/",
      "/upload/c_fill,w_400,h_400/"
    );

    return NextResponse.json({ url: urlOptimizada });
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    if (error instanceof ImageInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
    return NextResponse.json(
      { error: "Error interno al procesar imagen" },
      { status: authErrorStatus(error) }
    );
  }
}
