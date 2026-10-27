import type { MatchInput } from "./schemas";
import { MatchRequestError } from "./request-error";

export function validateMatchInput(input: MatchInput) {
  const [first, second] = input.teams;
  if (new Set(input.teams.map((team) => team.side)).size !== 2) {
    throw new MatchRequestError("El partido debe tener equipos A y B");
  }
  if (input.teams.some(team => new Set(team.playerIds).size !== team.playerIds.length)) {
    throw new MatchRequestError("Un jugador no puede repetirse dentro de un equipo");
  }
  const firstPlayers = new Set(first.playerIds);
  if (second.playerIds.some((id) => firstPlayers.has(id))) {
    throw new MatchRequestError("Un jugador no puede participar en ambos equipos");
  }
  const results = input.teams.map((team) => team.result).sort().join(":");
  if (results !== "DRAW:DRAW" && results !== "LOSS:WIN") {
    throw new MatchRequestError("Los resultados de los equipos no son consistentes");
  }
  const participants = new Set(input.teams.flatMap((team) => team.playerIds));
  if (input.mvpId && !participants.has(input.mvpId)) {
    throw new MatchRequestError("El MVP debe haber participado en el partido");
  }
}
