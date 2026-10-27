import { checkReadRateLimit } from "@/features/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { securityErrorResponse } from "@/features/security/errors";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/features/auth/session";
import { parsePlayerId, playerUpdateSchema } from "@/features/players/schemas";
import { playerError } from "@/features/players/errors";
import { updatePlayer } from "@/features/players/lifecycle";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  try {
    const id = parsePlayerId((await params).id);
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
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = playerError(error, "No se pudo cargar el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireRole("ADMIN");
    const id = parsePlayerId((await params).id);
    const input = playerUpdateSchema.parse(await readJsonBody(request));
    const player = await prisma.$transaction(tx => updatePlayer(tx, id, input), { isolationLevel: "Serializable" });
    return NextResponse.json(player);
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = playerError(error, "No se pudo actualizar el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireRole("ADMIN");
    const id = parsePlayerId((await params).id);
    const player = await prisma.$transaction(tx => updatePlayer(tx, id, { isHidden: true }), { isolationLevel: "Serializable" });
    return NextResponse.json(player);
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = playerError(error, "No se pudo borrar el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
