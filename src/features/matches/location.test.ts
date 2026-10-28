import { beforeEach, expect, it, vi } from "vitest";
import { resolveMatchLocation } from "./location";
import type { MatchInput } from "./schemas";
const findUnique = vi.fn();
const tx = { court: { findUnique } } as any;
const input = { format: 5 } as MatchInput;
const court = { id: 4, venueId: 2, format: 5, goals: [{ id: 11, position: 0 }, { id: 12, position: 1 }] };
beforeEach(() => { findUnique.mockReset(); findUnique.mockResolvedValue(court); });
it("admite partidos sin cancha/arcos y no consulta el catálogo", async () => {
  expect(await resolveMatchLocation(tx, input, null)).toEqual({ courtId: null, aGoalId: null, bGoalId: null, locationIsDemo: false });
  expect(findUnique).not.toHaveBeenCalled();
});
it("comprueba pertenencia de predio y arco antes de escribir", async () => {
  await expect(resolveMatchLocation(tx, { ...input, courtId: 4 }, 3)).rejects.toThrow("predio");
  expect((await resolveMatchLocation(tx, { ...input, format: 6, courtId: 4, aGoalId: 11 }, 2)).courtId).toBe(4);
  await expect(resolveMatchLocation(tx, { ...input, courtId: 4, aGoalId: 30 }, 2)).rejects.toThrow("arco");
  await expect(resolveMatchLocation(tx, { ...input, aGoalId: 11 }, 2)).rejects.toThrow("cancha");
});
it("completa el arco contrario y nunca asigna el mismo a ambos equipos", async () => {
  expect(await resolveMatchLocation(tx, { ...input, courtId: 4, aGoalId: 12 }, 2)).toEqual({ courtId: 4, aGoalId: 12, bGoalId: 11, locationIsDemo: false });
});
it("conserva la asignación de demostración si el cliente antiguo omite ubicación", async () => {
  const previous = { courtId: 4, locationIsDemo: true, teams: [{ side: "A", defendedGoalId: 11 }] };
  expect(await resolveMatchLocation(tx, input, 2, previous)).toEqual({ courtId: 4, aGoalId: 11, bGoalId: 12, locationIsDemo: true });
  expect((await resolveMatchLocation(tx, { ...input, courtId: 4, aGoalId: 12 }, 2, previous)).locationIsDemo).toBe(false);
});
it("permite cancha aún sin formato o arcos y rechaza un par incompleto", async () => {
  findUnique.mockResolvedValue({ ...court, format: null, goals: [] });
  expect((await resolveMatchLocation(tx, { ...input, courtId: 4 }, 2)).aGoalId).toBeNull();
  findUnique.mockResolvedValue({ ...court, goals: [{ id: 11 }] });
  await expect(resolveMatchLocation(tx, { ...input, courtId: 4, aGoalId: 11 }, 2)).rejects.toThrow("arco");
});
it("un administrador puede confirmar una ubicación de prueba idéntica solo si está completa", async () => {
  const previous = { courtId: 4, locationIsDemo: true, teams: [{ side: "A", defendedGoalId: 11 }] };
  expect((await resolveMatchLocation(tx, { ...input, confirmLocation: true }, 2, previous)).locationIsDemo).toBe(false);
  await expect(resolveMatchLocation(tx, { ...input, confirmLocation: true }, null)).rejects.toThrow("Completá");
  await expect(resolveMatchLocation(tx, { ...input, courtId: 4, aGoalId: null, confirmLocation: true }, 2, previous)).rejects.toThrow("Completá");
});
