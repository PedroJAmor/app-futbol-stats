import { describe, expect, it } from "vitest";
import { calculateClassicForm, calculateGroupStats, calculateStats, statsForHome, type RawStat } from "./stats";

const player = (id: number) => ({ id, firstName: `Jugador ${id}`, lastName: null, nickname: null, legacyFullName: null, photoUrl: null });
const row = (playerId: number, matchId: number, teamId: number, result: "WIN" | "DRAW" | "LOSS", isHidden = false): RawStat => ({
  player: player(playerId),
  team: { id: teamId, result, match: { id: matchId, format: 8, playedAt: new Date("2026-01-01T00:00:00Z"), isHidden } },
});

describe("stats V2", () => {
  it("clasifica la forma clásica de PES usando los últimos cinco resultados", () => {
    expect(calculateClassicForm(["WIN", "WIN", "WIN", "WIN", "LOSS"])).toMatchObject({ score: 3, direction: "up-right" });
    expect(calculateClassicForm(["WIN", "LOSS", "DRAW", "WIN", "LOSS"])).toMatchObject({ score: 0, direction: "neutral" });
    expect(calculateClassicForm(["LOSS", "LOSS", "LOSS", "LOSS", "WIN"])).toMatchObject({ score: -3, direction: "down-right" });
    expect(calculateClassicForm(["WIN", "WIN", "WIN", "WIN", "WIN", "LOSS"])).toMatchObject({ score: 5, direction: "up" });
  });

  it("calcula PJ, resultados, puntos y porcentajes sin partidos ocultos", () => {
    const [stats] = calculateStats([row(1, 1, 1, "WIN"), row(1, 2, 3, "DRAW"), row(1, 3, 5, "LOSS"), row(1, 4, 7, "WIN", true)]);
    expect(stats).toMatchObject({ pj: 3, v: 1, e: 1, d: 1, pts: 7, pctV: 33, pctD: 33 });
  });

  it("exige al menos un quinto de los PJ del jugador con más partidos en el ranking home", () => {
    const stats = [
      { ...calculateStats(Array.from({ length: 50 }, (_, index) => row(1, index + 1, index + 1, "WIN")))[0], pctV: 70 },
      { ...calculateStats(Array.from({ length: 10 }, (_, index) => row(2, index + 101, index + 101, "WIN")))[0], pctV: 80 },
      { ...calculateStats(Array.from({ length: 9 }, (_, index) => row(3, index + 201, index + 201, "WIN")))[0], pctV: 100 },
    ];
    expect(statsForHome(stats).map((stat) => stat.playerId)).toEqual([2, 1]);
  });

  it("calcula comparación, participación cruzada y head-to-head", () => {
    const result = calculateGroupStats([1, 2], [
      row(1, 1, 1, "WIN"), row(2, 1, 1, "WIN"),
      row(1, 2, 2, "LOSS"), row(2, 2, 3, "WIN"),
      row(1, 3, 4, "DRAW"), row(2, 3, 5, "DRAW"),
    ]);
    expect(result.together).toMatchObject({ pj: 1, v: 1 });
    expect(result.participation[1]).toMatchObject({ matchesWithGroup: 1, totalMatches: 3, percentage: 33 });
    expect(result.headToHead).toMatchObject({ pj: 2, v: 0, e: 1, d: 1, pctV: 0 });
  });
});
