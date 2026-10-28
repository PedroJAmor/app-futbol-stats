import type { Prisma } from "@prisma/client";

// List views do not need player histories, notes or complete venue records.
export const matchCardSelect = {
  id: true,
  playedAt: true,
  format: true,
  category: true,
  isHidden: true,
  venue: { select: { name: true } },
  teams: { orderBy: { side: "asc" as const }, select: { color: true, result: true } },
} satisfies Prisma.MatchSelect;

type MatchCardRow = Prisma.MatchGetPayload<{ select: typeof matchCardSelect }>;

export function toMatchCard(match: MatchCardRow) {
  return {
    id: match.id,
    playedAt: match.playedAt.toISOString(),
    format: match.format,
    category: match.category,
    isHidden: match.isHidden,
    venue: match.venue?.name ?? null,
    teams: match.teams,
  };
}
