import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/features/auth/session";
import { parsePlayerId, playerUpdateSchema } from "@/features/players/schemas";
import { playerError } from "@/features/players/errors";
import { updatePlayer } from "@/features/players/lifecycle";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parsePlayerId(params.id);
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
    return player ? NextResponse.json(player) : NextResponse.json({ error: "Jugador no encontrado." }, { status: 404 });
  } catch (error) {
    const failure = playerError(error, "No se pudo cargar el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const id = parsePlayerId(params.id);
    const input = playerUpdateSchema.parse(await request.json());
    const player = await prisma.$transaction(tx => updatePlayer(tx, id, input), { isolationLevel: "Serializable" });
    return NextResponse.json(player);
  } catch (error) {
    const failure = playerError(error, "No se pudo actualizar el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const id = parsePlayerId(params.id);
    const player = await prisma.$transaction(tx => updatePlayer(tx, id, { isHidden: true }), { isolationLevel: "Serializable" });
    return NextResponse.json(player);
  } catch (error) {
    const failure = playerError(error, "No se pudo borrar el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
