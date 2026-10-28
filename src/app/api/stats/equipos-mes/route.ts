import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkReadRateLimit } from "@/features/security/rate-limit";
import { statParticipationSelect } from "@/features/stats/select";
import { argentinaMonth, lastClosedMonth, closedMonthRange, availableClosedMonths, calculateMonthlyTeams } from "@/features/stats/monthly";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  const now = new Date();
  let month, range;
  try {
    month = request.nextUrl.searchParams.get("month") ?? lastClosedMonth(now);
    range = closedMonthRange(month, now);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Filtros inválidos." }, { status: 400 });
  }
  try {
    // Monthly teams always include every match category, including old filtered links.
    const common = { isHidden: false };
    const [dates, rows] = await Promise.all([
      prisma.match.findMany({ where: { ...common, playedAt: { lt: new Date(`${argentinaMonth(now)}-01T00:00:00-03:00`) } }, select: { playedAt: true } }),
      prisma.matchParticipation.findMany({ where: { match: { ...common, playedAt: range } }, select: statParticipationSelect }),
    ]);
    const months = [...new Set([month, ...availableClosedMonths(dates.map(match => match.playedAt), now)])].sort().reverse();
    return NextResponse.json({ month, months, ...calculateMonthlyTeams(rows) });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los equipos del mes." }, { status: 500 });
  }
}
