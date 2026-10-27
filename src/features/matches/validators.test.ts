import { describe, expect, it } from "vitest";
import { matchInputSchema } from "./schemas";
import { validateMatchInput } from "./validators";

const valid = { date: "2026-06-01", time: "21:00", format: 8, teams: [{ side: "A", color: "Oscuro", result: "WIN", playerIds: [1, 2, 3] }, { side: "B", color: "Claro", result: "LOSS", playerIds: [4, 5] }] };

describe("match validator", () => {
  it("rechaza repeticiones dentro del mismo equipo y resultados incompatibles", () => {
    expect(() => validateMatchInput(matchInputSchema.parse({ ...valid, teams: [{ ...valid.teams[0], playerIds: [1, 1] }, valid.teams[1]] }))).toThrow(/repetirse/);
    expect(() => validateMatchInput(matchInputSchema.parse({ ...valid, teams: [valid.teams[0], { ...valid.teams[1], result: "WIN" }] }))).toThrow(/consistentes/);
    expect(() => validateMatchInput(matchInputSchema.parse({ ...valid, teams: [valid.teams[0], valid.teams[0]] }))).toThrow(/equipos A y B/);
  });
  it("valida fechas, horas, números finitos e IDs compatibles con PostgreSQL", () => {
    for (const patch of [{ date: "2026-02-30" }, { time: "24:00" }, { format: 2_147_483_648 }, { temperature: Infinity }, { priceCents: 2_147_483_648 }, { venueId: -1 }]) {
      expect(matchInputSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
    }
  });
  it("acepta formatos positivos libres aunque no coincidan con participantes", () => {
    expect(() => validateMatchInput(matchInputSchema.parse(valid))).not.toThrow();
    expect(matchInputSchema.parse({ ...valid, format: 6 }).format).toBe(6);
    expect(matchInputSchema.parse({ ...valid, format: 9 }).format).toBe(9);
  });
  it("rechaza jugadores repetidos y MVP ajeno", () => {
    expect(() => validateMatchInput(matchInputSchema.parse({ ...valid, teams: [valid.teams[0], { ...valid.teams[1], playerIds: [3, 5] }] }))).toThrow();
    expect(() => validateMatchInput(matchInputSchema.parse({ ...valid, mvpId: 99 }))).toThrow();
  });
  it("acepta una cancha existente o nueva, pero no ambas", () => {
    expect(matchInputSchema.parse({ ...valid, venueId: 3 }).venueId).toBe(3);
    expect(matchInputSchema.parse({ ...valid, newVenueName: "La Avenida" }).newVenueName).toBe("La Avenida");
    expect(() => matchInputSchema.parse({ ...valid, venueId: 3, newVenueName: "Otra" })).toThrow();
  });
});
