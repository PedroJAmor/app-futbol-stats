import { calculateStats, type RawStat } from "@/lib/stats";

export function argentinaMonth(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit" }).format(date);
}

function followingMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, "0")}`;
}

export function lastClosedMonth(now = new Date()) {
  const [year, month] = argentinaMonth(now).split("-").map(Number);
  return `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, "0")}`;
}

export function closedMonthRange(month: string, now = new Date()) {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("El mes no es válido.");
  if (month >= argentinaMonth(now)) throw new Error("Solo se pueden consultar meses cerrados.");
  return {
    gte: new Date(`${month}-01T00:00:00-03:00`),
    lt: new Date(`${followingMonth(month)}-01T00:00:00-03:00`),
  };
}

export function availableClosedMonths(dates: Date[], now = new Date()) {
  const current = argentinaMonth(now);
  return [...new Set([lastClosedMonth(now), ...dates.map(argentinaMonth).filter(month => month < current)])].sort().reverse();
}

export function calculateMonthlyTeams(rows: RawStat[]) {
  const ordered = calculateStats(rows).sort((a, b) =>
    (b.v - b.d) - (a.v - a.d) || b.pj - a.pj || a.playerId - b.playerId,
  );
  // Opposite total orders prevent repeats even if score and PJ both tie.
  // A small filtered sample is shared between the two incomplete lists.
  const bestSize = Math.min(7, Math.ceil(ordered.length / 2));
  const best = ordered.slice(0, bestSize).map(player => ({ ...player, score: player.v - player.d }));
  const used = new Set(best.map(player => player.playerId));
  const worst = [...ordered].reverse().filter(player => !used.has(player.playerId)).slice(0, 7)
    .map(player => ({ ...player, score: player.v - player.d }));
  return { best, worst, candidateCount: ordered.length };
}
