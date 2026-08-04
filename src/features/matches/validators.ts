import type { MatchInput } from "./schemas";

export function validateMatchInput(input: MatchInput) {
  const [first, second] = input.teams;
  if (new Set(input.teams.map((team) => team.side)).size !== 2) {
    throw new Error("El partido debe tener equipos A y B");
  }
  const firstPlayers = new Set(first.playerIds);
  if (second.playerIds.some((id) => firstPlayers.has(id))) {
    throw new Error("Un jugador no puede participar en ambos equipos");
  }
  const results = input.teams.map((team) => team.result).sort().join(":");
  if (results !== "DRAW:DRAW" && results !== "LOSS:WIN") {
    throw new Error("Los resultados de los equipos no son consistentes");
  }
  const participants = new Set(input.teams.flatMap((team) => team.playerIds));
  if (input.mvpId && !participants.has(input.mvpId)) {
    throw new Error("El MVP debe haber participado en el partido");
  }
}
