export type TeamSelection = { aPlayers: number[]; bPlayers: number[]; mvpId: string };
export type TeamField = "aPlayers" | "bPlayers";

/** Explicit moves preserve the MVP; removing a participant clears it. */
export function updateTeamSelection<T extends TeamSelection>(form: T, side: TeamField, playerId: number, move = false): T {
  const other = side === "aPlayers" ? "bPlayers" : "aPlayers";
  if (!move && form[other].includes(playerId)) return form;
  const removing = !move && form[side].includes(playerId);
  return {
    ...form,
    [side]: removing ? form[side].filter(id => id !== playerId) : [...new Set([...form[side], playerId])],
    [other]: move ? form[other].filter(id => id !== playerId) : form[other],
    mvpId: removing && form.mvpId === String(playerId) ? "" : form.mvpId,
  };
}

export function matchesPlayerSearch(player: { firstName: string; lastName: string | null; nickname: string | null; legacyFullName: string | null; isActive: boolean }, query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const search = normalize(query);
  return search ? normalize([player.firstName, player.lastName, player.nickname, player.legacyFullName].filter(Boolean).join(" ")).includes(search) : player.isActive;
}
