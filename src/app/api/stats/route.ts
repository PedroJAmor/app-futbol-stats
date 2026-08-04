import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicMatchWhere, calculateStats } from "@/lib/stats";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format") ? Number(params.get("format")) : undefined;
  const dateFrom = params.get("dateFrom") ?? undefined;
  const dateTo = params.get("dateTo") ?? undefined;
  const minimumMatches = params.get("minimumMatches") ? Number(params.get("minimumMatches")) : 0;
  const matchWhere = buildPublicMatchWhere({ format, dateFrom, dateTo });
  const [rawStats, totalMatches] = await Promise.all([
    prisma.matchParticipation.findMany({
      where: { match: matchWhere },
      include: { player: true, team: { include: { match: true } } },
    }),
    prisma.match.count({ where: matchWhere }),
  ]);
  return NextResponse.json({ stats: calculateStats(rawStats, minimumMatches), totalMatches });
}
