import { parseCategories, type Category } from "./categories";
import type { Prisma } from "@prisma/client";

export type MatchFiltersValue = {
  dateFrom: string;
  dateTo: string;
  format: string;
  venueId: string;
  courtId: string;
  categories: Category[];
  playerIds: number[];
  sameTeam: boolean;
};

export const emptyMatchFilters = (): MatchFiltersValue => ({
  dateFrom: "", dateTo: "", format: "", venueId: "", courtId: "", categories: [], playerIds: [], sameTeam: false,
});

export const MAX_FILTER_PLAYERS = 100;

const MAX_DATABASE_INT = 2_147_483_647;

function positiveInteger(value: string, label: string) {
  if (!/^\d+$/.test(value)) throw new Error(`${label} debe ser un número entero positivo.`);
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > MAX_DATABASE_INT) {
    throw new Error(`${label} debe ser un número entero positivo válido.`);
  }
  return number;
}

function dateValue(value: string, label: string) {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) {
    throw new Error(`${label} debe ser una fecha válida.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} debe ser una fecha válida.`);
  }
  return value;
}

export function parseMatchFilters(params: URLSearchParams): MatchFiltersValue {
  const format = params.get("format")?.trim() ?? "";
  const venueId = params.get("venueId")?.trim() ?? "";
  const courtId = params.get("courtId")?.trim() ?? "";
  const categories = parseCategories(params);
  const dateFrom = dateValue(params.get("dateFrom")?.trim() ?? "", "Desde");
  const dateTo = dateValue(params.get("dateTo")?.trim() ?? "", "Hasta");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("La fecha desde no puede ser posterior a la fecha hasta.");
  }
  const rawPlayers = params.get("playerIds")?.trim() ?? "";
  if (rawPlayers.length > MAX_FILTER_PLAYERS * 11 || rawPlayers.split(",").length > MAX_FILTER_PLAYERS) {
    throw new Error(`Podés seleccionar hasta ${MAX_FILTER_PLAYERS} jugadores por búsqueda.`);
  }
  const playerIds = rawPlayers
    ? [...new Set(rawPlayers.split(",").map(value => positiveInteger(value.trim(), "Cada jugador")))]
    : [];
  const rawSameTeam = params.get("sameTeam")?.trim() ?? "";
  if (!["", "0", "1", "false", "true"].includes(rawSameTeam)) {
    throw new Error("La opción de compartir equipo no es válida.");
  }
  return {
    dateFrom,
    dateTo,
    format: format ? String(positiveInteger(format, "El formato")) : "",
    venueId: venueId ? String(positiveInteger(venueId, "El predio")) : "",
    courtId: courtId ? String(positiveInteger(courtId, "La cancha")) : "",
    categories,
    playerIds,
    sameTeam: playerIds.length >= 2 && (rawSameTeam === "1" || rawSameTeam === "true"),
  };
}

export function serializeMatchFilters(value: MatchFiltersValue): URLSearchParams {
  const params = new URLSearchParams();
  if (value.dateFrom) params.set("dateFrom", value.dateFrom);
  if (value.dateTo) params.set("dateTo", value.dateTo);
  if (value.format) params.set("format", value.format);
  if (value.venueId) params.set("venueId", value.venueId);
  if (value.courtId) params.set("courtId", value.courtId);
  if (value.categories?.length) params.set("categories", value.categories.join(","));
  if (value.playerIds.length) params.set("playerIds", [...new Set(value.playerIds)].join(","));
  if (value.sameTeam && value.playerIds.length >= 2) params.set("sameTeam", "1");
  return params;
}

export function buildMatchFilterWhere(value: MatchFiltersValue, includeHidden = false): Prisma.MatchWhereInput {
  const where: Prisma.MatchWhereInput = includeHidden ? {} : { isHidden: false };
  if (value.format) where.format = Number(value.format);
  if (value.venueId) where.venueId = Number(value.venueId);
  if (value.courtId) where.courtId = Number(value.courtId);
  if (value.categories?.length) where.category = { in: value.categories };
  if (value.dateFrom || value.dateTo) {
    where.playedAt = {
      ...(value.dateFrom && { gte: new Date(`${value.dateFrom}T00:00:00-03:00`) }),
      ...(value.dateTo && { lte: new Date(`${value.dateTo}T23:59:59.999-03:00`) }),
    };
  }
  if (value.playerIds.length) {
    if (value.sameTeam && value.playerIds.length >= 2) {
      where.teams = {
        some: { AND: value.playerIds.map(playerId => ({ participations: { some: { playerId } } })) },
      };
    } else {
      where.AND = value.playerIds.map(playerId => ({ participations: { some: { playerId } } }));
    }
  }
  return where;
}
