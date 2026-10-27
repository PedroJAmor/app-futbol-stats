import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatArgentinaDate } from "@/lib/dates";

export const MATCH_MENTION_PATTERN = /@\[match:(\d+):(tkn_[a-zA-Z0-9_-]+)\]/g;

export function createMatchMentionToken(matchId: number) {
  return `@[match:${matchId}:tkn_${randomUUID().replaceAll("-", "").slice(0, 16)}]`;
}

export function extractMatchMentionRefs(text: string) {
  return Array.from(text.matchAll(MATCH_MENTION_PATTERN), (match) => ({
    matchId: Number(match[1]),
    token: match[2],
  }));
}

export async function buildMentionCreates(text: string): Promise<Prisma.ForumMentionCreateWithoutPostInput[]> {
  const matches = extractMatchMentionRefs(text);
  const tokens = new Set<string>();
  const creates: Prisma.ForumMentionCreateWithoutPostInput[] = [];

  for (const { matchId, token } of matches) {
    if (!Number.isInteger(matchId) || matchId <= 0 || matchId > 2_147_483_647) throw new Error("Partido de mención inválido");
    if (tokens.has(token)) throw new Error("Una mención no puede repetirse en el mismo texto");
    tokens.add(token);

    const target = await prisma.match.findFirst({
      where: { id: matchId, isHidden: false },
      include: { teams: { orderBy: { side: "asc" } } },
    });
    if (!target) throw new Error("La mención apunta a un partido inexistente u oculto");
    creates.push({
      targetType: "MATCH",
      token,
      labelSnapshot: `F${target.format} · ${formatArgentinaDate(target.playedAt)} · ${target.teams[0]?.color ?? "A"} vs ${target.teams[1]?.color ?? "B"}`,
      match: { connect: { id: matchId } },
    });
  }
  return creates;
}
