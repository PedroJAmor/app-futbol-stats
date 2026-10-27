import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { argentinaFormToUtc } from "@/lib/dates";
import { getCurrentUser, requireRole } from "@/features/auth/session";
import { matchInputSchema } from "@/features/matches/schemas";
import { validateMatchInput } from "@/features/matches/validators";
import { matchError, parseMatchId } from "@/features/matches/errors";
import { validateParticipants } from "@/features/matches/participants";
import { resolveVenueId } from "@/features/matches/venues";

const include = { teams: { orderBy: { side: "asc" as const }, include: { participations: { include: { player: true } } } }, mvp: true, venue: true };

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseMatchId(params.id);
    const match = await prisma.match.findUnique({ where: { id }, include });
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    if (match.isHidden) {
      const user = await getCurrentUser();
      if (!user || user.role === "USER") return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    return NextResponse.json(match);
  } catch (error) {
    const failure = matchError(error, "No se pudo cargar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const id = parseMatchId(params.id);
    const input = matchInputSchema.parse(await request.json());
    validateMatchInput(input);
    const match = await prisma.$transaction(async (tx) => {
      await validateParticipants(tx, input);
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
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(match);
  } catch (error) {
    const failure = matchError(error, "No se pudo actualizar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.match.update({
      where: { id: parseMatchId(params.id) },
      data: { isHidden: true, hiddenAt: new Date() },
    }));
  } catch (error) {
    const failure = matchError(error, "No se pudo ocultar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.match.update({
      where: { id: parseMatchId(params.id) },
      data: { isHidden: false, hiddenAt: null },
    }));
  } catch (error) {
    const failure = matchError(error, "No se pudo restaurar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
