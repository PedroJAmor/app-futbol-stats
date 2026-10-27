import { describe, expect, it } from "vitest";
import { matchesPlayerSearch, updateTeamSelection } from "./editor";

const form = { aPlayers: [1, 2], bPlayers: [3], mvpId: "2", notes: "Conservar" };
const player = { firstName: "José", lastName: "Pérez", nickname: "Pepe", legacyFullName: null, isActive: false };

describe("selección de equipos", () => {
  it("mueve jugadores sin duplicarlos y conserva MVP y campos ingresados", () => {
    expect(updateTeamSelection(form, "bPlayers", 2, true)).toEqual({ ...form, aPlayers: [1], bPlayers: [3, 2] });
    expect(updateTeamSelection(form, "aPlayers", 2, true).aPlayers).toEqual([1, 2]);
  });
  it("impide añadir un jugador del otro equipo sin movimiento explícito", () => {
    expect(updateTeamSelection(form, "aPlayers", 3)).toBe(form);
  });
  it("limpia MVP al quitarlo y lo conserva al quitar otro jugador", () => {
    expect(updateTeamSelection(form, "aPlayers", 2).mvpId).toBe("");
    expect(updateTeamSelection(form, "aPlayers", 1).mvpId).toBe("2");
  });
});
describe("sugerencias y búsqueda de jugadores", () => {
  it("solo sugiere activos sin búsqueda y permite buscar inactivos por nombre y apodo sin acentos", () => {
    expect(matchesPlayerSearch(player, "  ")).toBe(false);
    expect(matchesPlayerSearch({ ...player, isActive: true }, "")).toBe(true);
    expect(matchesPlayerSearch(player, "jose")).toBe(true);
    expect(matchesPlayerSearch(player, "PEPE")).toBe(true);
    expect(matchesPlayerSearch(player, "nadie")).toBe(false);
  });
});
