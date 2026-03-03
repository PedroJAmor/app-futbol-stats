// src/app/api/upload/route.ts
// POST /api/upload
// Recibe una imagen en base64 y la sube a Cloudinary
// Devuelve la URL pública de la imagen
// Solo accesible por admin

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { imagen } = await req.json();

    if (!imagen) {
      return NextResponse.json(
        { error: "No se recibió imagen" },
        { status: 400 }
      );
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

    // Firma: sha1(folder=jugadores&timestamp=...&api_secret)
    const crypto = await import("crypto");
    const toSign = `folder=jugadores&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha256")
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
      { status: 500 }
    );
  }
}
