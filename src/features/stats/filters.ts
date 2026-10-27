import { MAX_FILTER_PLAYERS, parseMatchFilters } from "@/features/matches/filters";

export function parseStatsFilter(params: URLSearchParams) {
  const filters = parseMatchFilters(params);
  const minimum = params.get("minimumMatches");
  if (minimum && (!/^\d+$/.test(minimum) || Number(minimum) > 2_147_483_647)) throw new Error("El mínimo de partidos debe ser un número entero válido.");
  return { format: filters.format ? Number(filters.format) : undefined, dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined, minimumMatches: minimum ? Number(minimum) : 0 };
}

export function parseComparisonIds(params: URLSearchParams) {
  const raw = params.get("ids") ?? "";
  if (raw.length > MAX_FILTER_PLAYERS * 11) throw new Error(`Podés comparar hasta ${MAX_FILTER_PLAYERS} jugadores.`);
  const values = raw.split(",");
  if (values.length > MAX_FILTER_PLAYERS) throw new Error(`Podés comparar hasta ${MAX_FILTER_PLAYERS} jugadores.`);
  if (values.some(id => !/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2_147_483_647)) throw new Error("Los jugadores seleccionados no son válidos.");
  const ids = [...new Set(values.map(Number))];
  if (ids.length < 2) throw new Error("Se necesitan al menos 2 jugadores diferentes.");
  return ids;
}
