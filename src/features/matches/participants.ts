import type { Prisma } from "@prisma/client";
import type { MatchInput } from "./schemas";
import { MatchRequestError } from "./errors";

// Must run inside the Serializable match transaction, together with the writes.
// Inactive players remain eligible; logically deleted players do not.
export async function validateParticipants(tx: Prisma.TransactionClient, input: MatchInput) {
  const ids = [...new Set(input.teams.flatMap(team => team.playerIds))];
  const count = await tx.player.count({ where: { id: { in: ids }, isHidden: false } });
  if (count !== ids.length) throw new MatchRequestError("Uno o más jugadores ya no están disponibles. Revisá los equipos.", 409);
}
