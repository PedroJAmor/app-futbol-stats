import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { argentinaFormToUtc } from "@/lib/dates";
import { getCurrentUser, requireRole, authErrorStatus } from "@/features/auth/session";
import { matchInputSchema } from "@/features/matches/schemas";
import { validateMatchInput } from "@/features/matches/validators";
import { resolveVenueId } from "@/features/matches/venues";

const include = { teams: { orderBy: { side: "asc" as const }, include: { participations: { include: { player: true } } } }, mvp: true, venue: true };

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const match = await prisma.match.findUnique({ where: { id }, include });
  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.isHidden) {
    const user = await getCurrentUser();
    if (!user || user.role === "USER") return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  return NextResponse.json(match);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const id = Number(params.id);
    const input = matchInputSchema.parse(await request.json());
    validateMatchInput(input);
    const match = await prisma.$transaction(async (tx) => {
      const venueId = await resolveVenueId(tx, input);
      await tx.matchParticipation.deleteMany({ where: { matchId: id } });
      await tx.match.update({
        where: { id },
        data: {
          playedAt: argentinaFormToUtc(input.date, input.time), format: input.format,
          venueId, priceCents: input.priceCents ?? null,
          weather: input.weather || null, temperature: input.temperature,
          notes: input.notes || null, mvpId: input.mvpId,
        },
      });
      for (const team of input.teams) {
        const saved = await tx.matchTeam.upsert({
          where: { matchId_side: { matchId: id, side: team.side } },
          update: { color: team.color, result: team.result },
          create: { matchId: id, side: team.side, color: team.color, result: team.result },
        });
        await tx.matchParticipation.createMany({
          data: team.playerIds.map((playerId) => ({ matchId: id, teamId: saved.id, playerId })),
        });
      }
      return tx.match.findUniqueOrThrow({ where: { id }, include });
    });
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el partido" }, { status: authErrorStatus(error) || 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.match.update({
      where: { id: Number(params.id) },
      data: { isHidden: true, hiddenAt: new Date() },
    }));
  } catch (error) {
    return NextResponse.json({ error: "No se pudo ocultar el partido" }, { status: authErrorStatus(error) });
  }
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.match.update({
      where: { id: Number(params.id) },
      data: { isHidden: false, hiddenAt: null },
    }));
  } catch (error) {
    return NextResponse.json({ error: "No se pudo restaurar el partido" }, { status: authErrorStatus(error) });
  }
}
