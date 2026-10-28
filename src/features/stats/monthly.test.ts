import { describe, expect, it } from "vitest";
import { argentinaMonth, lastClosedMonth, closedMonthRange, availableClosedMonths, calculateMonthlyTeams } from "./monthly";
import type { RawStat } from "@/lib/stats";

function row(id: number, result: string, hidden = false): RawStat {
  return { player: { id, firstName: `Jugador ${id}`, lastName: null, nickname: null, legacyFullName: null, photoUrl: null }, team: { id, result, match: { id, format: 7, playedAt: new Date("2026-09-12T18:00:00Z"), isHidden: hidden } } };
}

describe("meses cerrados según Argentina", () => {
  it("no habilita octubre hasta las 00:00 de Argentina del 1 de noviembre", () => {
    const before = new Date("2026-11-01T02:59:59Z");
    const after = new Date("2026-11-01T03:00:00Z");
    expect(argentinaMonth(before)).toBe("2026-10");
    expect(lastClosedMonth(before)).toBe("2026-09");
    expect(() => closedMonthRange("2026-10", before)).toThrow("cerrados");
    expect(closedMonthRange("2026-10", after)).toEqual({ gte: new Date("2026-10-01T03:00:00Z"), lt: new Date("2026-11-01T03:00:00Z") });
  });
  it("incluye el último mes calendario vacío y no expone meses actuales/futuros", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    expect(availableClosedMonths([new Date("2026-05-01T15:00:00Z"), new Date("2026-10-01T15:00:00Z"), new Date("2026-12-01T15:00:00Z")], now)).toEqual(["2026-09", "2026-05"]);
    for (const month of ["2026-13", "2026-00", "2026-9", "0000-01", "2026-10", "2026-11"]) expect(() => closedMonthRange(month, now)).toThrow();
  });
  it("resuelve el cruce de año", () => {
    const now = new Date("2027-01-01T03:00:00Z");
    expect(lastClosedMonth(now)).toBe("2026-12");
    expect(closedMonthRange("2026-12", now).lt.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("selecciones mensuales", () => {
  it("ordena por saldo, desempata PJ y no exige más de una participación", () => {
    const data = [row(1, "WIN"), row(2, "WIN"), row(2, "DRAW"), row(3, "LOSS"), row(4, "LOSS"), row(4, "DRAW"), ...Array.from({ length: 10 }, (_, i) => row(i + 5, "DRAW"))];
    const result = calculateMonthlyTeams(data);
    expect(result.best[0]).toMatchObject({ playerId: 2, score: 1, pj: 2 });
    expect(result.best[1]).toMatchObject({ playerId: 1, score: 1, pj: 1 });
    expect(result.worst[0]).toMatchObject({ playerId: 3, score: -1, pj: 1 });
    expect(result.worst[1]).toMatchObject({ playerId: 4, score: -1, pj: 2 });
    expect(result.best).toHaveLength(7); expect(result.worst).toHaveLength(7);
    expect(new Set([...result.best, ...result.worst].map(player => player.playerId)).size).toBe(14);
  });
  it("resuelve empates completos de forma estable e inversa", () => {
    const result = calculateMonthlyTeams(Array.from({ length: 20 }, (_, index) => row(index + 1, "DRAW")));
    expect(result.best.map(player => player.playerId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.worst.map(player => player.playerId)).toEqual([20, 19, 18, 17, 16, 15, 14]);
  });
  it("excluye ocultos y reparte una muestra filtrada pequeña sin repetir", () => {
    const result = calculateMonthlyTeams([row(1, "WIN"), row(2, "LOSS"), row(3, "DRAW"), row(4, "WIN", true)]);
    expect(result.candidateCount).toBe(3);
    expect(result.best).toHaveLength(2); expect(result.worst).toHaveLength(1);
    expect(new Set([...result.best, ...result.worst].map(player => player.playerId)).size).toBe(3);
    expect(calculateMonthlyTeams([])).toEqual({ best: [], worst: [], candidateCount: 0 });
  });
});
