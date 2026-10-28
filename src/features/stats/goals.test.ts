import { describe, expect, it } from "vitest";
import { calculateGoalStats, type GoalMatch, type GoalVenue } from "./goals";

const venues: GoalVenue[] = [{ id: 1, name: "Rebote", courts: [{ id: 10, name: "F7", goals: [{ id: 101, name: "Estacionamiento", position: 0 }, { id: 102, name: "Pared", position: 1 }] }] }];
function match(id: number, outcome: "A" | "B" | "DRAW", extra: Partial<GoalMatch> = {}): GoalMatch {
  return { id, venueId: 1, courtId: 10, isHidden: false, locationIsDemo: false, teams: [{ result: outcome === "DRAW" ? "DRAW" : outcome === "A" ? "WIN" : "LOSS", defendedGoalId: 101 }, { result: outcome === "DRAW" ? "DRAW" : outcome === "B" ? "WIN" : "LOSS", defendedGoalId: 102 }], ...extra };
}
const courtResult = (rows: GoalMatch[]) => calculateGoalStats(venues, rows).venues[0].courts[0];

describe("estadísticas por arco", () => {
  it("cuenta cada partido una sola vez y representa 50/10/40", () => {
    const rows = [...Array.from({ length: 5 }, (_, i) => match(i, "A")), match(5, "DRAW"), ...Array.from({ length: 4 }, (_, i) => match(i + 6, "B"))];
    expect(courtResult(rows)).toMatchObject({ matches: 10, counts: [5, 1, 4], percentages: [50, 10, 40] });
  });
  it("no depende del orden de equipos ni de nombres, solo de los identificadores", () => {
    const row = match(1, "A"); row.teams.reverse();
    expect(courtResult([row])).toMatchObject({ counts: [1, 0, 0] });
    const renamed = structuredClone(venues); renamed[0].courts[0].goals[0].name = "Nuevo nombre";
    expect(calculateGoalStats(renamed, [row]).venues[0].courts[0]).toMatchObject({ matches: 1, counts: [1, 0, 0] });
  });
  it("excluye ocultos y resultados/lados incompletos o inconsistentes", () => {
    const rows = [match(1, "A", { isHidden: true }), match(2, "A", { teams: [] }), match(3, "A", { teams: [{ result: "WIN", defendedGoalId: 101 }, { result: "LOSS", defendedGoalId: 101 }] }), match(4, "A", { teams: [{ result: "WIN", defendedGoalId: 101 }, { result: "WIN", defendedGoalId: 102 }] }), match(5, "A", { courtId: null })];
    const result = calculateGoalStats(venues, rows).venues[0];
    expect(result.pendingMatches).toBe(4); expect(result.unassignedMatches).toBe(1);
    expect(result.courts[0]).toMatchObject({ matches: 0, pendingMatches: 3, percentages: [0, 0, 0] });
  });
  it("identifica asignaciones sintéticas y redondea a un total de 100", () => {
    const result = courtResult([match(1, "A", { locationIsDemo: true }), match(2, "DRAW"), match(3, "B")]);
    expect(result.demoMatches).toBe(1); expect(result.percentages).toEqual([34, 33, 33]);
    expect(result.percentages.reduce((sum, value) => sum + value, 0)).toBe(100);
  });
  it("un predio sin canchas conserva sus encuentros pendientes", () => {
    const result = calculateGoalStats([{ id: 1, name: "Rebote", courts: [] }], [match(1, "A", { courtId: null })]);
    expect(result.venues[0]).toMatchObject({ courts: [], pendingMatches: 1, unassignedMatches: 1 });
  });
});

it("informa los partidos públicos sin predio sin mezclarlos en una cancha", () => {
  const result = calculateGoalStats(venues, [match(1, "A", { venueId: null, courtId: null }), match(2, "A", { venueId: null, courtId: null, isHidden: true })]);
  expect(result.unassignedVenueMatches).toBe(1);
  expect(result.venues[0].pendingMatches).toBe(0);
});
