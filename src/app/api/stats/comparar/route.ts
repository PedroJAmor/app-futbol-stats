import { checkReadRateLimit } from "@/features/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicMatchWhere, calculateGroupStats } from "@/lib/stats";

import { parseStatsFilter, parseComparisonIds } from "@/features/stats/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  const params = request.nextUrl.searchParams;
  let playerIds, filter;
  try { playerIds = parseComparisonIds(params); filter = parseStatsFilter(params); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Filtros inválidos." }, { status: 400 }); }
  const matchWhere = buildPublicMatchWhere(filter);
  try {
  const rows = await prisma.matchParticipation.findMany({
    where: { playerId: { in: playerIds }, match: matchWhere },
    include: { player: true, team: { include: { match: true } } },
  });
  return NextResponse.json(calculateGroupStats(playerIds, rows));
  } catch {
    return NextResponse.json({ error: "No se pudo cargar la comparación." }, { status: 500 });
  }
}
