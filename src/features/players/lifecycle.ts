import type { Prisma } from "@prisma/client";
import { playerBirthDate, PlayerRequestError, type PlayerUpdateInput } from "./schemas";

// Caller uses Serializable isolation, as do match writes. A concurrent new
// participation and a player hide cannot both commit with an invalid history.
export async function updatePlayer(tx: Prisma.TransactionClient, id: number, input: PlayerUpdateInput) {
  const player = await tx.player.findUnique({ where: { id }, select: { id: true } });
  if (!player) throw new PlayerRequestError("Jugador no encontrado.", 404);
  if (input.isHidden === true) {
    const count = await tx.matchParticipation.count({ where: { playerId: id } });
    if (count > 0) throw new PlayerRequestError("No se puede borrar este jugador porque tiene partidos registrados, incluso si están eliminados. Podés marcarlo como inactivo para conservar su historial.", 409);
  }
  return tx.player.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName || null }),
      ...(input.nickname !== undefined && { nickname: input.nickname || null }),
      ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl || null }),
      ...(input.birthDate !== undefined && { birthDate: playerBirthDate(input.birthDate) }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isHidden !== undefined && { isHidden: input.isHidden }),
    },
  });
}
