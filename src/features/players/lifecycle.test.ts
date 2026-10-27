import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { updatePlayer } from "./lifecycle";
import { parsePlayerId, playerCreateSchema, playerUpdateSchema } from "./schemas";

function transaction(participations: number, exists = true) {
  const calls = {
    player: { findUnique: vi.fn().mockResolvedValue(exists ? { id: 7 } : null), update: vi.fn().mockImplementation(async args => ({ id: 7, ...args.data })) },
    matchParticipation: { count: vi.fn().mockResolvedValue(participations) },
  };
  return { calls, tx: calls as unknown as Prisma.TransactionClient };
}

describe("ciclo de vida del jugador", () => {
  it("bloquea el borrado con cualquier participación, incluso en partidos ocultos", async () => {
    const { tx, calls } = transaction(1);
    await expect(updatePlayer(tx, 7, { isHidden: true })).rejects.toMatchObject({ status: 409 });
    expect(calls.matchParticipation.count).toHaveBeenCalledWith({ where: { playerId: 7 } });
    expect(calls.player.update).not.toHaveBeenCalled();
  });
  it("oculta un jugador sin historial mediante actualización", async () => {
    const { tx, calls } = transaction(0);
    await expect(updatePlayer(tx, 7, { isHidden: true })).resolves.toMatchObject({ id: 7, isHidden: true });
    expect(calls.player.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { isHidden: true } });
  });
  it("permite inactivar un jugador con historial", async () => {
    const { tx, calls } = transaction(12);
    await expect(updatePlayer(tx, 7, { isActive: false })).resolves.toMatchObject({ isActive: false });
    expect(calls.matchParticipation.count).not.toHaveBeenCalled();
  });
  it("devuelve 404 sin modificar un jugador inexistente", async () => {
    const { tx, calls } = transaction(0, false);
    await expect(updatePlayer(tx, 7, { nickname: "Mimi" })).rejects.toMatchObject({ status: 404 });
    expect(calls.player.update).not.toHaveBeenCalled();
  });
});

describe("validación de jugadores", () => {
  it("crea activos por defecto y acepta el estado inactivo explícito", () => {
    expect(playerCreateSchema.parse({ firstName: " Mimi " })).toMatchObject({ firstName: "Mimi", isActive: true });
    expect(playerCreateSchema.parse({ firstName: "Mimi", isActive: false }).isActive).toBe(false);
  });
  it.each([{ firstName: " " }, { firstName: "A", isActive: "false" }, { firstName: "A", birthDate: "2026-02-30" }, { firstName: "A", photoUrl: "javascript:alert(1)" }])("rechaza datos inválidos %j", input => {
    expect(playerCreateSchema.safeParse(input).success).toBe(false);
  });
  it("acepta fecha real bisiesta y rechaza cambios vacíos o estados coaccionados", () => {
    expect(playerCreateSchema.safeParse({ firstName: "A", birthDate: "2000-02-29" }).success).toBe(true);
    expect(playerUpdateSchema.safeParse({}).success).toBe(false);
    expect(playerUpdateSchema.safeParse({ isHidden: "true" }).success).toBe(false);
  });
  it.each(["NaN", "0", "-1", "1.2", "2147483648", "1e2"])("rechaza ID %s", value => {
    expect(() => parsePlayerId(value)).toThrow();
  });
});
