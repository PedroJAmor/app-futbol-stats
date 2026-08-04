import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicMatchWhere, calculateGroupStats } from "@/lib/stats";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const playerIds = (params.get("ids") ?? "").split(",").map(Number).filter(Number.isInteger);
  if (playerIds.length < 2) return NextResponse.json({ error: "Se necesitan al menos 2 jugadores" }, { status: 400 });
  const matchWhere = buildPublicMatchWhere({
    format: params.get("format") ? Number(params.get("format")) : undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
  });
  const rows = await prisma.matchParticipation.findMany({
    where: { playerId: { in: playerIds }, match: matchWhere },
    include: { player: true, team: { include: { match: true } } },
  });
  return NextResponse.json(calculateGroupStats(playerIds, rows));
}
