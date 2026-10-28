import type { Category } from "@/features/matches/categories";
export const POINTS = { WIN: 4, DRAW: 2, LOSS: 1 } as const;

export type ClassicForm = {
  score: number;
  direction: "up" | "up-right" | "neutral" | "down-right" | "down";
  symbol: "↑" | "↗" | "→" | "↘" | "↓";
  label: string;
};

export function calculateClassicForm(results: string[]): ClassicForm {
  const score = results.slice(0, 5).reduce((total, result) => total + (result === "WIN" ? 1 : result === "LOSS" ? -1 : 0), 0);
  if (score >= 4) return { score, direction: "up", symbol: "↑", label: "Excelente" };
  if (score >= 2) return { score, direction: "up-right", symbol: "↗", label: "Buena" };
  if (score >= -1) return { score, direction: "neutral", symbol: "→", label: "Normal" };
  if (score >= -3) return { score, direction: "down-right", symbol: "↘", label: "Baja" };
  return { score, direction: "down", symbol: "↓", label: "Muy baja" };
}

export type RawStat = {
  player: {
    id: number;
    firstName: string;
    lastName: string | null;
    nickname: string | null;
    legacyFullName: string | null;
    photoUrl: string | null;
  };
  team: {
    id: number;
    result: string;
    match: { id: number; format: number; playedAt: Date; isHidden: boolean };
  };
};

export type PlayerStats = {
  playerId: number;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  legacyFullName: string | null;
  photoUrl: string | null;
  pj: number;
  v: number;
  e: number;
  d: number;
  pts: number;
  pctV: number;
  pctD: number;
};

export type StatsFilter = { format?: number; dateFrom?: string; dateTo?: string; minimumMatches?: number; categories?: Category[]; venueId?: number; courtId?: number };

export function buildPublicMatchWhere(filter: StatsFilter = {}) {
  const where: Record<string, unknown> = { isHidden: false };
  if (filter.format) where.format = filter.format;
  if (filter.categories?.length) where.category = { in: filter.categories };
  if (filter.venueId) where.venueId = filter.venueId;
  if (filter.courtId) where.courtId = filter.courtId;
  if (filter.dateFrom || filter.dateTo) {
    where.playedAt = {
      ...(filter.dateFrom && { gte: new Date(`${filter.dateFrom}T00:00:00-03:00`) }),
      ...(filter.dateTo && { lte: new Date(`${filter.dateTo}T23:59:59.999-03:00`) }),
    };
  }
  return where;
}

export function calculateStats(rawStats: RawStat[], minimumMatches = 0) {
  const stats = new Map<number, PlayerStats>();
  for (const { player, team } of rawStats) {
    if (team.match.isHidden) continue;
    const current = stats.get(player.id) ?? {
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname,
      legacyFullName: player.legacyFullName,
      photoUrl: player.photoUrl,
      pj: 0, v: 0, e: 0, d: 0, pts: 0, pctV: 0, pctD: 0,
    };
    current.pj++;
    if (team.result === "WIN") { current.v++; current.pts += POINTS.WIN; }
    else if (team.result === "DRAW") { current.e++; current.pts += POINTS.DRAW; }
    else { current.d++; current.pts += POINTS.LOSS; }
    stats.set(player.id, current);
  }
  return [...stats.values()]
    .filter((stat) => stat.pj >= minimumMatches)
    .map((stat) => ({
      ...stat,
      pctV: stat.pj ? Math.round((stat.v / stat.pj) * 100) : 0,
      pctD: stat.pj ? Math.round((stat.d / stat.pj) * 100) : 0,
    }));
}

export function statsForHome(allStats: PlayerStats[]) {
  const mostMatches = Math.max(0, ...allStats.map((stat) => stat.pj));
  const minimumMatches = Math.ceil(mostMatches / 5);
  return [...allStats]
    .filter((stat) => stat.pj >= minimumMatches)
    .sort((a, b) => b.pctV - a.pctV || b.pj - a.pj || b.pts - a.pts)
    .slice(0, 10);
}

export function calculateGroupStats(playerIds: number[], rawStats: RawStat[]) {
  if (playerIds.length < 2) throw new Error("Se necesitan al menos 2 jugadores");
  const visible = rawStats.filter((row) => !row.team.match.isHidden);
  const byMatchTeam = new Map<string, RawStat[]>();
  for (const row of visible) {
    const key = `${row.team.match.id}:${row.team.id}`;
    byMatchTeam.set(key, [...(byMatchTeam.get(key) ?? []), row]);
  }
  const togetherRows = [...byMatchTeam.values()].filter((rows) =>
    playerIds.every((id) => rows.some((row) => row.player.id === id))
  );
  const together = { pj: togetherRows.length, v: 0, e: 0, d: 0, pctV: 0, pctD: 0 };
  for (const rows of togetherRows) {
    const result = rows[0].team.result;
    if (result === "WIN") together.v++;
    else if (result === "DRAW") together.e++;
    else together.d++;
  }
  together.pctV = together.pj ? Math.round((together.v / together.pj) * 100) : 0;
  together.pctD = together.pj ? Math.round((together.d / together.pj) * 100) : 0;

  const togetherMatches = new Set(togetherRows.map((rows) => rows[0].team.match.id));
  const participation = Object.fromEntries(playerIds.map((id) => {
    const rows = visible.filter((row) => row.player.id === id);
    const total = new Set(rows.map((row) => row.team.match.id)).size;
    return [id, { playerId: id, matchesWithGroup: togetherMatches.size, totalMatches: total, percentage: total ? Math.round((togetherMatches.size / total) * 100) : 0 }];
  }));

  let headToHead = null;
  if (playerIds.length === 2) {
    const [a, b] = playerIds;
    const matches = new Map<number, RawStat[]>();
    for (const row of visible) matches.set(row.team.match.id, [...(matches.get(row.team.match.id) ?? []), row]);
    const h2h = { pj: 0, v: 0, e: 0, d: 0, pctV: 0 };
    for (const rows of matches.values()) {
      const aRow = rows.find((row) => row.player.id === a);
      const bRow = rows.find((row) => row.player.id === b);
      if (!aRow || !bRow || aRow.team.id === bRow.team.id) continue;
      h2h.pj++;
      if (aRow.team.result === "WIN") h2h.v++;
      else if (aRow.team.result === "DRAW") h2h.e++;
      else h2h.d++;
    }
    h2h.pctV = h2h.pj ? Math.round((h2h.v / h2h.pj) * 100) : 0;
    headToHead = h2h;
  }
  return { together, participation, individual: calculateStats(visible.filter((row) => playerIds.includes(row.player.id))), headToHead };
}
