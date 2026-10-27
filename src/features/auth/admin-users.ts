import { z } from "zod";
import type { Prisma, Role } from "@prisma/client";

export const adminUserInput = z.object({
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).optional(),
  playerId: z.number().int().positive().max(2_147_483_647).nullable().optional(),
}).strict().refine(input => Object.keys(input).length > 0, "No hay cambios para guardar.");

export class AdminUserError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function updateAdminUser(tx: Prisma.TransactionClient, actor: { role: Role }, id: string, input: z.infer<typeof adminUserInput>) {
  if (input.role !== undefined && actor.role !== "SUPERADMIN") throw new AdminUserError("No tenés permiso para cambiar roles.", 403);
  const user = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) throw new AdminUserError("Usuario no encontrado.", 404);
  if (user.role === "SUPERADMIN" && input.role && input.role !== "SUPERADMIN") {
    if (await tx.user.count({ where: { role: "SUPERADMIN" } }) <= 1) throw new AdminUserError("Debe quedar al menos un superadministrador.", 409);
  }
  if (input.playerId !== undefined && input.playerId !== null) {
    const player = await tx.player.findFirst({ where: { id: input.playerId, isHidden: false }, select: { id: true } });
    if (!player) throw new AdminUserError("El jugador no existe o está oculto.", 400);
  }
  return tx.user.update({ where: { id }, data: input, include: { player: true } });
}
