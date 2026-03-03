// src/app/api/jugadores/route.ts
// GET  /api/jugadores        → lista todos los jugadores
// POST /api/jugadores        → crea un jugador nuevo (solo admin)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jugadores = await prisma.player.findMany({
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(jugadores);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener jugadores" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nombre, apodo, foto, fechaNac } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const jugador = await prisma.player.create({
      data: {
        nombre: nombre.trim(),
        apodo: apodo?.trim() || null,
        foto: foto || null,
        fechaNac: fechaNac ? new Date(fechaNac) : null,
      },
    });

    return NextResponse.json(jugador, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear jugador" },
      { status: 500 }
    );
  }
}
