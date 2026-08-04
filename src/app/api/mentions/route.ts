import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMatchMentionToken } from "@/features/forum/mentions";
import { formatArgentinaDate } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const matches = await prisma.match.findMany({
    where: {
      isHidden: false,
      ...(query && /^\d+$/.test(query) ? { id: Number(query) } : {}),
    },
    take: 8,
    orderBy: { playedAt: "desc" },
    include: { teams: { orderBy: { side: "asc" } } },
  });
  return NextResponse.json(matches.map((match) => ({
    id: match.id,
    token: createMatchMentionToken(match.id),
    label: `Partido #${match.id} · F${match.format} · ${formatArgentinaDate(match.playedAt)} · ${match.teams[0]?.color ?? "A"} vs ${match.teams[1]?.color ?? "B"}`,
  })));
}
