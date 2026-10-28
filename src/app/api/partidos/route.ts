import { resolveMatchLocation } from "@/features/matches/location";
import { suggestCategory } from "@/features/matches/categories";
import { checkReadRateLimit } from "@/features/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { securityErrorResponse } from "@/features/security/errors";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { argentinaFormToUtc } from "@/lib/dates";
import { getCurrentUser, requireRole } from "@/features/auth/session";
import { matchInputSchema } from "@/features/matches/schemas";
import { validateMatchInput } from "@/features/matches/validators";
import { matchError } from "@/features/matches/errors";
import { validateParticipants } from "@/features/matches/participants";
import { resolveVenueId } from "@/features/matches/venues";
import { buildMatchFilterWhere, parseMatchFilters } from "@/features/matches/filters";
import { matchCardSelect, toMatchCard } from "@/features/matches/cards";

const matchInclude = {
  teams: { orderBy: { side: "asc" as const }, include: { participations: { include: { player: true } }, defendedGoal: true } },
  mvp: true,
  venue: true,
  court: { include: { goals: { orderBy: { position: "asc" as const } } } },
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  let filters;
  try {
    filters = parseMatchFilters(request.nextUrl.searchParams);
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Filtros inválidos" }, { status: 400 });
  }
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "1";
  const currentUser = includeHidden ? await getCurrentUser() : null;
  const maySeeHidden = includeHidden && currentUser && ["ADMIN", "SUPERADMIN"].includes(currentUser.role);
  const where = buildMatchFilterWhere(filters, Boolean(maySeeHidden));
  if (request.nextUrl.searchParams.get("view") === "cards") {
    const matches = await prisma.match.findMany({ where, orderBy: { playedAt: "desc" }, select: matchCardSelect });
    return NextResponse.json(matches.map(toMatchCard));
  }
  return NextResponse.json(await prisma.match.findMany({
    where,
    orderBy: { playedAt: "desc" },
    include: matchInclude,
  }));
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireRole("ADMIN");
    const input = matchInputSchema.parse(await readJsonBody(request));
    validateMatchInput(input);
    const match = await prisma.$transaction(async (tx) => {
      await validateParticipants(tx, input);
      const venueId = await resolveVenueId(tx, input);
      const location = await resolveMatchLocation(tx, input, venueId);
      const created = await tx.match.create({ data: {
        playedAt: argentinaFormToUtc(input.date, input.time),
        format: input.format,
        category: input.category ?? suggestCategory(input.date, input.format),
        courtId: location.courtId,
        locationIsDemo: false,
        venueId,
        priceCents: input.priceCents ?? null,
        weather: input.weather || null,
        temperature: input.temperature,
        notes: input.notes || null,
        mvpId: input.mvpId,
      } });
      for (const team of input.teams) {
        const savedTeam = await tx.matchTeam.create({
          data: { matchId: created.id, side: team.side, color: team.color, result: team.result, defendedGoalId: team.side === "A" ? location.aGoalId : location.bGoalId },
        });
        await tx.matchParticipation.createMany({
          data: team.playerIds.map((playerId) => ({ matchId: created.id, teamId: savedTeam.id, playerId })),
        });
      }
      return tx.match.findUniqueOrThrow({ where: { id: created.id }, include: matchInclude });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    const failure = matchError(error, "No se pudo crear el partido.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
