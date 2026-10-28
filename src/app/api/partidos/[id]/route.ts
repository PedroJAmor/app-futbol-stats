import { resolveMatchLocation } from "@/features/matches/location";
import { checkReadRateLimit } from "@/features/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { securityErrorResponse } from "@/features/security/errors";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { argentinaFormToUtc } from "@/lib/dates";
import { getCurrentUser, requireRole } from "@/features/auth/session";
import { matchInputSchema } from "@/features/matches/schemas";
import { validateMatchInput } from "@/features/matches/validators";
import { matchError, parseMatchId } from "@/features/matches/errors";
import { validateParticipants } from "@/features/matches/participants";
import { resolveVenueId } from "@/features/matches/venues";

const include = { teams: { orderBy: { side: "asc" as const }, include: { participations: { include: { player: true } }, defendedGoal: true } }, mvp: true, venue: true, court: { include: { goals: { orderBy: { position: "asc" as const } } } } };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  try {
    const id = parseMatchId((await params).id);
    const match = await prisma.match.findUnique({ where: { id }, include });
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    if (match.isHidden) {
      const user = await getCurrentUser();
      if (!user || user.role === "USER") return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    return NextResponse.json(match);
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = matchError(error, "No se pudo cargar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireRole("ADMIN");
    const id = parseMatchId((await params).id);
    const input = matchInputSchema.parse(await readJsonBody(request));
    validateMatchInput(input);
    const match = await prisma.$transaction(async (tx) => {
      await validateParticipants(tx, input);
      const venueId = await resolveVenueId(tx, input);
      const previous = await tx.match.findUniqueOrThrow({ where: { id }, include: { teams: true } });
      const location = await resolveMatchLocation(tx, input, venueId, previous);
      await tx.matchParticipation.deleteMany({ where: { matchId: id } });
      await tx.match.update({
        where: { id },
        data: {
          playedAt: argentinaFormToUtc(input.date, input.time), format: input.format,
          category: input.category === undefined ? previous.category : input.category,
          courtId: location.courtId, locationIsDemo: location.locationIsDemo,
          venueId, priceCents: input.priceCents ?? null,
          weather: input.weather || null, temperature: input.temperature,
          notes: input.notes || null, mvpId: input.mvpId,
        },
      });
      for (const team of input.teams) {
        const saved = await tx.matchTeam.upsert({
          where: { matchId_side: { matchId: id, side: team.side } },
          update: { color: team.color, result: team.result, defendedGoalId: team.side === "A" ? location.aGoalId : location.bGoalId },
          create: { matchId: id, side: team.side, color: team.color, result: team.result, defendedGoalId: team.side === "A" ? location.aGoalId : location.bGoalId },
        });
        await tx.matchParticipation.createMany({
          data: team.playerIds.map((playerId) => ({ matchId: id, teamId: saved.id, playerId })),
        });
      }
      return tx.match.findUniqueOrThrow({ where: { id }, include });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(match);
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = matchError(error, "No se pudo actualizar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.match.update({
      where: { id: parseMatchId((await params).id) },
      data: { isHidden: true, hiddenAt: new Date() },
    }));
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = matchError(error, "No se pudo ocultar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.match.update({
      where: { id: parseMatchId((await params).id) },
      data: { isHidden: false, hiddenAt: null },
    }));
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = matchError(error, "No se pudo restaurar el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
