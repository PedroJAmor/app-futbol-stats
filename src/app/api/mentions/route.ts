import { checkReadRateLimit } from "@/features/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMatchMentionToken } from "@/features/forum/mentions";
import { formatArgentinaDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (query && (!/^\d{1,10}$/.test(query) || Number(query) <= 0 || Number(query) > 2_147_483_647)) return NextResponse.json({ error: "Número de partido inválido." }, { status: 400 });
  const matches = await prisma.match.findMany({
    where: {
      isHidden: false,
      ...(query && /^\d+$/.test(query) ? { id: Number(query) } : {}),
    },
    take: 8,
    orderBy: { playedAt: "desc" },
    select: { id: true, format: true, playedAt: true, teams: { orderBy: { side: "asc" }, select: { color: true } } },
  });
  return NextResponse.json(matches.map((match) => ({
    id: match.id,
    token: createMatchMentionToken(match.id),
    label: `Partido #${match.id} · F${match.format} · ${formatArgentinaDate(match.playedAt)} · ${match.teams[0]?.color ?? "A"} vs ${match.teams[1]?.color ?? "B"}`,
  })));
}
