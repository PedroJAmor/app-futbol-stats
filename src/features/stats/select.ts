import type { Prisma } from "@prisma/client";

// Shared by rankings and comparisons: omit full match/player records and
// participation fields that never contribute to these calculations.
export const statParticipationSelect = {
  player: { select: {
    id: true, firstName: true, lastName: true, nickname: true,
    legacyFullName: true, photoUrl: true,
  } },
  team: { select: {
    id: true, result: true,
    match: { select: { id: true, format: true, playedAt: true, isHidden: true } },
  } },
} satisfies Prisma.MatchParticipationSelect;
