// src/app/api/partidos/[id]/route.ts
// GET    /api/partidos/:id    → ficha completa del partido
// PUT    /api/partidos/:id    → edita el partido (solo admin)
// DELETE /api/partidos/:id    → elimina el partido y sus datos (solo admin)

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
    const partido = await prisma.match.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            players: {
              include: {
                player: {
                  select: {
                    id: true,
                    nombre: true,
                    apodo: true,
                    foto: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!partido) {
      return NextResponse.json(
        { error: "Partido no encontrado" },
        { status: 404 }
      );
    }

    // Resolver el MVP si existe
    let mvp = null;
    if (partido.mvpId) {
      mvp = await prisma.player.findUnique({
        where: { id: partido.mvpId },
        select: { id: true, nombre: true, apodo: true, foto: true },
      });
    }

    return NextResponse.json({ ...partido, mvp });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener partido" },
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
    const { fecha, formato, cancha, precio, clima, temperatura, notas, mvpId } = body;

    const partido = await prisma.match.update({
      where: { id },
      data: {
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(formato !== undefined && { formato }),
        ...(cancha !== undefined && { cancha: cancha?.trim() || null }),
        ...(precio !== undefined && { precio: precio ? Number(precio) : null }),
        ...(clima !== undefined && { clima: clima?.trim() || null }),
        ...(temperatura !== undefined && { temperatura: temperatura ? Number(temperatura) : null }),
        ...(notas !== undefined && { notas: notas?.trim() || null }),
        ...(mvpId !== undefined && { mvpId: mvpId ? Number(mvpId) : null }),
      },
    });

    return NextResponse.json(partido);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar partido" },
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
    // Cascade borra MatchTeam y MatchPlayerStat automáticamente (definido en schema)
    await prisma.match.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar partido" },
      { status: 500 }
    );
  }
}
