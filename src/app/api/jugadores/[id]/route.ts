import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, authErrorStatus } from "@/features/auth/session";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const player = await prisma.player.findFirst({
    where: { id, isHidden: false },
    include: {
      participations: {
        where: { match: { isHidden: false } },
        include: { team: true, match: true },
        orderBy: { match: { playedAt: "desc" } },
      },
    },
  });
  return player ? NextResponse.json(player) : NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const id = Number(params.id);
    const body = await request.json();
    if (body.isHidden === true) {
      const participations = await prisma.matchParticipation.count({ where: { playerId: id } });
      if (participations) return NextResponse.json({ error: "No se puede ocultar un jugador con historial" }, { status: 409 });
    }
    return NextResponse.json(await prisma.player.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName.trim() }),
        ...(body.lastName !== undefined && { lastName: body.lastName?.trim() || null }),
        ...(body.nickname !== undefined && { nickname: body.nickname?.trim() || null }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl || null }),
        ...(body.birthDate !== undefined && { birthDate: body.birthDate ? new Date(`${body.birthDate}T12:00:00Z`) : null }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.isHidden !== undefined && { isHidden: Boolean(body.isHidden) }),
      },
    }));
  } catch (error) {
    return NextResponse.json({ error: "No se pudo actualizar el jugador" }, { status: authErrorStatus(error) });
  }
}

export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  return PUT(new NextRequest("http://local", { method: "PUT", body: JSON.stringify({ isHidden: true }) }), context);
}
