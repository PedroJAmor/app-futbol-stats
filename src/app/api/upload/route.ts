// src/app/api/upload/route.ts
// POST /api/upload
// Recibe una imagen en base64 y la sube a Cloudinary
// Devuelve la URL pública de la imagen
// Solo accesible por admin

import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorStatus } from "@/features/auth/session";

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { imagen } = await req.json();

    if (!imagen) {
      return NextResponse.json(
        { error: "No se recibió imagen" },
        { status: 400 }
      );
    }
    if (typeof imagen !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(imagen)) {
      return NextResponse.json({ error: "Formato de imagen inválido" }, { status: 400 });
    }
    if (imagen.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen supera el límite permitido" }, { status: 413 });
    }

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
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("Cloudinary error:", err);
      return NextResponse.json(
        { error: "Error al subir imagen a Cloudinary" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Devolver la URL con transformación: 400x400, recortado al centro
    const urlOptimizada = data.secure_url.replace(
      "/upload/",
      "/upload/c_fill,w_400,h_400/"
    );

    return NextResponse.json({ url: urlOptimizada });
  } catch (error) {
    console.error("Error en upload:", error);
    return NextResponse.json(
      { error: "Error interno al procesar imagen" },
      { status: authErrorStatus(error) }
    );
  }
}
