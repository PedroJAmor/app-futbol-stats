import { statParticipationSelect } from "@/features/stats/select";
import { checkReadRateLimit } from "@/features/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicMatchWhere, calculateStats } from "@/lib/stats";

import { parseStatsFilter } from "@/features/stats/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  const params = request.nextUrl.searchParams;
  let filter;
  try { filter = parseStatsFilter(params); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Filtros inválidos." }, { status: 400 }); }
  const { minimumMatches } = filter;
  const matchWhere = buildPublicMatchWhere(filter);
  try {
  const [rawStats, totalMatches] = await Promise.all([
    prisma.matchParticipation.findMany({
      where: { match: matchWhere },
      select: statParticipationSelect,
    }),
    prisma.match.count({ where: matchWhere }),
  ]);
  return NextResponse.json({ stats: calculateStats(rawStats, minimumMatches), totalMatches });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las estadísticas." }, { status: 500 });
  }
}
