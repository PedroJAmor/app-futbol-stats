export type PlayerName = {
  firstName: string;
  lastName?: string | null;
  nickname?: string | null;
  legacyFullName?: string | null;
};

export function formatPlayerName(player: PlayerName): string {
  const firstName = player.firstName.trim() || player.legacyFullName?.trim() || "Sin nombre";
  const lastName = player.lastName?.trim();
  const nickname = player.nickname?.trim();
  return [firstName, nickname ? `"${nickname}"` : null, lastName].filter(Boolean).join(" ");
}

export function fullPlayerName(player: PlayerName): string {
  const firstName = player.firstName.trim() || player.legacyFullName?.trim() || "Sin nombre";
  const lastName = player.lastName?.trim();
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function shortPlayerName(player: PlayerName): string {
  return player.nickname?.trim() || player.firstName.trim() || player.legacyFullName?.trim() || "Sin nombre";
}

export function playerGivenName(player: PlayerName): string {
  const source = player.firstName.trim() || player.legacyFullName?.trim() || "Sin nombre";
  return source.split(/\s+/)[0];
}

export function playerGivenNameKey(player: PlayerName): string {
  return playerGivenName(player).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function lineupPlayerName(player: PlayerName, repeatedGivenNames: Set<string>): string {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;

  const givenName = playerGivenName(player);
  if (!repeatedGivenNames.has(playerGivenNameKey(player))) return givenName;

  const surname = player.lastName?.trim();
  return surname ? `${givenName} ${surname.charAt(0).toUpperCase()}.` : givenName;
}

export function splitLastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}
