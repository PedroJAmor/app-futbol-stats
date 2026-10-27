import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { buildMatchFilterWhere, emptyMatchFilters, parseMatchFilters, serializeMatchFilters } from "./filters";

const parse = (query: string) => parseMatchFilters(new URLSearchParams(query));

describe("match filter validation", () => {
  it("defaults to all public matches and round-trips combined filters", () => {
    expect(parse("")).toEqual(emptyMatchFilters());
    expect(buildMatchFilterWhere(parse(""))).toEqual({ isHidden: false });
    const value = parse("dateFrom=2026-10-01&dateTo=2026-10-24&format=7&venueId=2&playerIds=1,2,1&sameTeam=1");
    expect(value.playerIds).toEqual([1, 2]);
    expect(parseMatchFilters(serializeMatchFilters(value))).toEqual(value);
    expect(serializeMatchFilters(emptyMatchFilters()).size).toBe(0);
  });

  it.each([
    "format=0", "format=-7", "format=NaN", "format=7.5", "format=2147483648",
    "venueId=Infinity", "venueId=-1", "venueId=1e3", "playerIds=1,no", "playerIds=1,,2",
    "playerIds=0", "playerIds=2147483648", "playerIds=1,2.5", "sameTeam=perhaps",
    "dateFrom=2026-02-30", "dateTo=2025-02-29", "dateFrom=2026-13-01", "dateTo=10/24/2026",
    "dateFrom=0000-01-01", "dateFrom=2026-10-25&dateTo=2026-10-24",
  ])("rejects malformed filters instead of returning the full list: %s", query => {
    expect(() => parse(query)).toThrow(Error);
  });

  it("accepts leap days, deduplicates IDs and disables same-team without two distinct players", () => {
    expect(parse("dateFrom=2024-02-29").dateFrom).toBe("2024-02-29");
    expect(parse("playerIds=01,1,2&sameTeam=true")).toMatchObject({ playerIds: [1, 2], sameTeam: true });
    expect(parse("sameTeam=1").sameTeam).toBe(false);
    expect(parse("playerIds=1,1&sameTeam=1").sameTeam).toBe(false);
    expect(parse("playerIds=1,2&sameTeam=false").sameTeam).toBe(false);
  });
});

describe("match filter database conditions", () => {
  it("combines venue, format and inclusive Argentina date limits", () => {
    const where = buildMatchFilterWhere(parse("format=7&venueId=4&dateFrom=2026-10-24&dateTo=2026-10-24"));
    expect(where).toEqual({
      isHidden: false,
      format: 7,
      venueId: 4,
      playedAt: { gte: new Date("2026-10-24T03:00:00.000Z"), lte: new Date("2026-10-25T02:59:59.999Z") },
    });
    expect(buildMatchFilterWhere(parse("dateTo=2026-10-24")).playedAt).toEqual({ lte: new Date("2026-10-25T02:59:59.999Z") });
  });

  it("keeps hidden matches excluded unless the authorized caller explicitly includes them", () => {
    const value = parse("format=7&playerIds=1,2&sameTeam=1");
    expect(buildMatchFilterWhere(value).isHidden).toBe(false);
    expect(buildMatchFilterWhere(value, true)).not.toHaveProperty("isHidden");
    expect(buildMatchFilterWhere(value, true).format).toBe(7);
  });

  it("requires every selected participant, while optionally requiring a single shared team", () => {
    // Evaluate only the participant predicates against independent fixture teams.
    // This catches OR conditions and an AND placed outside teams.some.
    const fixtures = [
      { id: 1, teams: [[1, 2], [3, 4]] },
      { id: 2, teams: [[1, 3], [2, 4]] },
      { id: 3, teams: [[1], [3]] },
      { id: 4, teams: [[1, 2, 3], [4]] },
    ];
    function evaluatePredicate(where: Prisma.MatchWhereInput | Prisma.MatchTeamWhereInput, teams: number[][]): boolean {
      if (where.AND) {
        const clauses = Array.isArray(where.AND) ? where.AND : [where.AND];
        if (!clauses.every(clause => evaluatePredicate(clause, teams))) return false;
      }
      if ("teams" in where && where.teams?.some) {
        if (!teams.some(team => evaluatePredicate(where.teams!.some!, [team]))) return false;
      }
      const playerId = where.participations?.some?.playerId;
      if (typeof playerId === "number" && !teams.flat().includes(playerId)) return false;
      return true;
    }
    const matching = (query: string) => {
      const where = buildMatchFilterWhere(parse(query));
      return fixtures.filter(fixture => (typeof where.id !== "number" || where.id === fixture.id) && evaluatePredicate(where, fixture.teams)).map(fixture => fixture.id);
    };
    expect(matching("playerIds=1,2")).toEqual([1, 2, 4]);
    expect(matching("playerIds=1,2&sameTeam=1")).toEqual([1, 4]);
    expect(matching("playerIds=1,2,3")).toEqual([1, 2, 4]);
    expect(matching("playerIds=1,2,3&sameTeam=1")).toEqual([4]);
    expect(matching("playerIds=1,5")).toEqual([]);
    expect(matching("playerIds=1,5&sameTeam=1")).toEqual([]);
  });
});
it("rechaza listas excesivas antes de construir condiciones SQL", () => {
  const ids = Array.from({ length: 101 }, (_, i) => i + 1).join(",");
  expect(() => parse(`playerIds=${ids}`)).toThrow("100");
  expect(() => parse(`playerIds=${"1".repeat(1200)}`)).toThrow("100");
  expect(parse(`playerIds=${ids.split(",").slice(0, 100).join(",")}`).playerIds).toHaveLength(100);
});
