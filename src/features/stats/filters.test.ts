import { describe, expect, it } from "vitest";
import { buildPublicMatchWhere } from "@/lib/stats";
import { parseComparisonIds, parseStatsFilter } from "./filters";

describe("filtros de estadísticas", () => {
  it.each(["dateFrom=2026-02-30", "dateFrom=2026-10-25&dateTo=2026-10-24", "format=NaN", "format=-1", "minimumMatches=-1", "minimumMatches=2.5", "minimumMatches=Infinity"])("rechaza %s", query => {
    expect(() => parseStatsFilter(new URLSearchParams(query))).toThrow();
  });
  it("conserva filtros de Argentina y mínimo sin requerir valores", () => {
    expect(parseStatsFilter(new URLSearchParams("format=7&dateFrom=2026-10-24&minimumMatches=3"))).toMatchObject({ format: 7, dateFrom: "2026-10-24", minimumMatches: 3 });
    expect(parseStatsFilter(new URLSearchParams())).toMatchObject({ minimumMatches: 0 });
  });
  it("requiere dos jugadores distintos y rechaza IDs inválidos", () => {
    for (const ids of ["1,1", "1,", "0,1", "-1,2", "abc,2", "2147483648,2"]) expect(() => parseComparisonIds(new URLSearchParams({ ids }))).toThrow();
    expect(parseComparisonIds(new URLSearchParams({ ids: "2,1,2" }))).toEqual([2, 1]);
  });
});
it("acota la complejidad de las comparaciones", () => {
  const ids = Array.from({ length: 101 }, (_, i) => i + 1).join(",");
  expect(() => parseComparisonIds(new URLSearchParams({ ids }))).toThrow("100");
  expect(() => parseComparisonIds(new URLSearchParams({ ids: "1".repeat(1200) }))).toThrow("100");
});

it("combina predio, cancha y categorías sin perder las fechas ni ocultar el filtro público", () => {
  const filters = parseStatsFilter(new URLSearchParams("venueId=2&courtId=10&categories=LEAGUE,SPECIAL&dateFrom=2026-09-01&dateTo=2026-09-30"));
  expect(buildPublicMatchWhere(filters)).toMatchObject({ isHidden: false, venueId: 2, courtId: 10, category: { in: ["LEAGUE", "SPECIAL"] }, playedAt: { gte: new Date("2026-09-01T03:00:00Z"), lte: new Date("2026-10-01T02:59:59.999Z") } });
  for (const query of ["courtId=-1", "courtId=0", "courtId=2147483648", "courtId=NaN", "categories=OTHER"]) expect(() => parseStatsFilter(new URLSearchParams(query))).toThrow();
});
