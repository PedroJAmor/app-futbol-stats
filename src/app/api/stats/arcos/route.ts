import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkReadRateLimit } from "@/features/security/rate-limit";
import { parseStatsFilter } from "@/features/stats/filters";
import { buildPublicMatchWhere } from "@/lib/stats";
import { calculateGoalStats } from "@/features/stats/goals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  let filter;
  try { filter = parseStatsFilter(request.nextUrl.searchParams); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Filtros inválidos." }, { status: 400 }); }
  try {
    const [venues, matches] = await Promise.all([
      prisma.venue.findMany({
        where: { ...(filter.venueId ? { id: filter.venueId } : {}), ...(filter.courtId ? { courts: { some: { id: filter.courtId } } } : {}) },
        orderBy: { name: "asc" }, select: { id: true, name: true, courts: {
          where: filter.courtId ? { id: filter.courtId } : {}, orderBy: { name: "asc" },
          select: { id: true, name: true, goals: { select: { id: true, name: true, position: true }, orderBy: { position: "asc" } } },
        } },
      }),
      prisma.match.findMany({ where: buildPublicMatchWhere(filter), select: {
        id: true, venueId: true, courtId: true, isHidden: true, locationIsDemo: true,
        teams: { select: { result: true, defendedGoalId: true } },
      } }),
    ]);
    return NextResponse.json(calculateGoalStats(venues, matches));
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las estadísticas por arco." }, { status: 500 });
  }
}
