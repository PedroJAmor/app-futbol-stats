// src/app/api/jugadores/[id]/route.ts
// GET    /api/jugadores/:id   → ficha completa del jugador con sus partidos
// PUT    /api/jugadores/:id   → edita datos del jugador (solo admin)
// DELETE /api/jugadores/:id   → desactiva el jugador (solo admin, no borra para preservar historial)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const jugador = await prisma.player.findUnique({
      where: { id },
      include: {
        stats: {
          include: {
            team: {
              include: {
                match: {
                  select: {
                    id: true,
                    fecha: true,
                    formato: true,
                    cancha: true,
                    mvpId: true,
                  },
                },
              },
            },
          },
          orderBy: { team: { match: { fecha: "desc" } } },
        },
      },
    });

    if (!jugador) {
      return NextResponse.json(
        { error: "Jugador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(jugador);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener jugador" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { nombre, apodo, foto, fechaNac, activo } = body;

    const jugador = await prisma.player.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(apodo !== undefined && { apodo: apodo?.trim() || null }),
        ...(foto !== undefined && { foto }),
        ...(fechaNac !== undefined && {
          fechaNac: fechaNac ? new Date(fechaNac) : null,
        }),
        ...(activo !== undefined && { activo }),
      },
    });

    return NextResponse.json(jugador);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar jugador" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    // Desactivar en lugar de borrar para preservar el historial de partidos
    const jugador = await prisma.player.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json(jugador);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al desactivar jugador" },
      { status: 500 }
    );
  }
}
