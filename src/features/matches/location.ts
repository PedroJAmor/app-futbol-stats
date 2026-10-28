import type { Prisma } from "@prisma/client";
import type { MatchInput } from "./schemas";
import { MatchRequestError } from "./request-error";

type PreviousLocation = { courtId?: number | null; locationIsDemo?: boolean; teams?: { side: string; defendedGoalId?: number | null }[] };

export async function resolveMatchLocation(tx: Prisma.TransactionClient, input: MatchInput, venueId: number | null, previous?: PreviousLocation) {
  const oldGoal = previous?.teams?.find(team => team.side === "A")?.defendedGoalId ?? null;
  const courtId = input.courtId === undefined ? previous?.courtId ?? null : input.courtId;
  const aGoalId = input.aGoalId !== undefined ? input.aGoalId
    : input.courtId !== undefined && input.courtId !== previous?.courtId ? null : oldGoal;
  if (!courtId) {
    if (input.confirmLocation) throw new MatchRequestError("Completá la cancha y ambos arcos antes de confirmar la ubicación real.");
    if (aGoalId) throw new MatchRequestError("Elegí una cancha antes de asignar un arco.");
    return { courtId: null, aGoalId: null, bGoalId: null, locationIsDemo: false };
  }
  const court = await tx.court.findUnique({ where: { id: courtId }, include: { goals: { orderBy: { position: "asc" } } } });
  if (!court || court.venueId !== venueId) throw new MatchRequestError("La cancha no pertenece al predio seleccionado.");
  let bGoalId: number | null = null;
  if (aGoalId) {
    if (court.goals.length !== 2 || !court.goals.some(goal => goal.id === aGoalId)) throw new MatchRequestError("El arco no pertenece a esta cancha o falta configurar el arco contrario.");
    bGoalId = court.goals.find(goal => goal.id !== aGoalId)!.id;
  }
  if (input.confirmLocation && (!aGoalId || !bGoalId)) throw new MatchRequestError("Completá la cancha y ambos arcos antes de confirmar la ubicación real.");
  const unchanged = previous?.courtId === courtId && oldGoal === (aGoalId ?? null);
  return { courtId, aGoalId: aGoalId ?? null, bGoalId, locationIsDemo: unchanged && !input.confirmLocation ? previous?.locationIsDemo ?? false : false };
}
