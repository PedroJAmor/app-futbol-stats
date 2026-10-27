import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { adminUserInput, updateAdminUser } from "./admin-users";

function fixture(role = "USER", count = 2, player = { id: 7 } as { id: number } | null) {
  const mocks = { user: { findUnique: vi.fn().mockResolvedValue({ id: "user", role }), count: vi.fn().mockResolvedValue(count), update: vi.fn().mockResolvedValue({ id: "user" }) }, player: { findFirst: vi.fn().mockResolvedValue(player) } };
  return { mocks, tx: mocks as unknown as Prisma.TransactionClient };
}
describe("administración de cuentas", () => {
  it("ADMIN puede vincular jugadores pero no cambiar roles", async () => {
    const { tx, mocks } = fixture();
    await expect(updateAdminUser(tx, { role: "ADMIN" }, "user", { role: "SUPERADMIN" })).rejects.toMatchObject({ status: 403 });
    expect(mocks.user.update).not.toHaveBeenCalled();
    await updateAdminUser(tx, { role: "ADMIN" }, "user", { playerId: 7 });
    expect(mocks.player.findFirst).toHaveBeenCalledWith({ where: { id: 7, isHidden: false }, select: { id: true } });
    expect(mocks.user.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { playerId: 7 }, include: { player: true } });
  });
  it("SUPERADMIN no puede degradar al último superadministrador", async () => {
    const { tx, mocks } = fixture("SUPERADMIN", 1);
    await expect(updateAdminUser(tx, { role: "SUPERADMIN" }, "user", { role: "USER" })).rejects.toMatchObject({ status: 409 });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it("permite degradar cuando queda otro superadministrador", async () => {
    const { tx, mocks } = fixture("SUPERADMIN");
    await updateAdminUser(tx, { role: "SUPERADMIN" }, "user", { role: "ADMIN" });
    expect(mocks.user.update).toHaveBeenCalledOnce();
  });
  it("rechaza vincular jugadores ocultos o inexistentes", async () => {
    const { tx, mocks } = fixture("USER", 2, null);
    await expect(updateAdminUser(tx, { role: "ADMIN" }, "user", { playerId: 7 })).rejects.toMatchObject({ status: 400 });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it.each([{ role: "ROOT" }, { playerId: "7" }, { playerId: 0 }, { playerId: false }, {}, { isAdmin: true }])("rechaza payload inválido %j", input => expect(adminUserInput.safeParse(input).success).toBe(false));
  it("permite desvincular con null explícito", () => expect(adminUserInput.parse({ playerId: null })).toEqual({ playerId: null }));
});
