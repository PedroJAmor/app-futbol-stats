// src/lib/stats.ts
// Toda la lógica de estadísticas: puntos, porcentajes, filtros y comparación de jugadores

// ─── Sistema de puntos ───────────────────────────────────────────────────────
// Victoria: 4pts · Empate: 2pts · Derrota: 1pt
// Se premia la participación: vale más venir y perder que no venir

export const PUNTOS = { WIN: 4, DRAW: 2, LOSS: 1 } as const;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PlayerStats = {
  playerId: number;
  nombre: string;
  apodo: string | null;
  foto: string | null;
  pj: number;  // partidos jugados
  v: number;   // victorias
  e: number;   // empates
  d: number;   // derrotas
  pts: number; // puntos totales
  pctV: number; // porcentaje de victorias (0-100)
  pctD: number; // porcentaje de derrotas (0-100)
};

export type StatsFilter = {
  formato?: number;      // 5, 7 u 11
  fechaDesde?: string;   // ISO date string, ej: "2025-01-01"
  fechaHasta?: string;   // ISO date string, ej: "2025-12-31"
  pjMinimo?: number;     // mínimo de partidos jugados para aparecer
};

// Tipo del raw stat que viene de la DB (lo que Prisma devuelve)
export type RawStat = {
  player: { id: number; nombre: string; apodo: string | null; foto: string | null };
  team: {
    resultado: string;
    match: { id: number; formato: number; fecha: Date };
  };
};

// ─── Filtro para queries de Prisma ──────────────────────────────────────────

export function buildMatchWhere(filter: StatsFilter) {
  const matchWhere: Record<string, any> = {};

  if (filter.formato) {
    matchWhere.formato = filter.formato;
  }

  if (filter.fechaDesde || filter.fechaHasta) {
    matchWhere.fecha = {};
    if (filter.fechaDesde) {
      matchWhere.fecha.gte = new Date(filter.fechaDesde);
    }
    if (filter.fechaHasta) {
      // Incluir hasta el final del día indicado
      const hasta = new Date(filter.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      matchWhere.fecha.lte = hasta;
    }
  }

  return matchWhere;
}

// ─── Cálculo de estadísticas individuales ───────────────────────────────────

export function calcularStats(
  rawStats: RawStat[],
  pjMinimo = 0
): PlayerStats[] {
  const map = new Map<number, PlayerStats>();

  for (const stat of rawStats) {
    const { player, team } = stat;

    if (!map.has(player.id)) {
      map.set(player.id, {
        playerId: player.id,
        nombre: player.nombre,
        apodo: player.apodo,
        foto: player.foto,
        pj: 0, v: 0, e: 0, d: 0, pts: 0, pctV: 0, pctD: 0,
      });
    }

    const s = map.get(player.id)!;
    s.pj++;

    if (team.resultado === "WIN") {
      s.v++;
      s.pts += PUNTOS.WIN;
    } else if (team.resultado === "DRAW") {
      s.e++;
      s.pts += PUNTOS.DRAW;
    } else {
      s.d++;
      s.pts += PUNTOS.LOSS;
    }
  }

  return Array.from(map.values())
    .filter((s) => s.pj >= pjMinimo)
    .map((s) => ({
      ...s,
      pctV: s.pj > 0 ? Math.round((s.v / s.pj) * 100) : 0,
      pctD: s.pj > 0 ? Math.round((s.d / s.pj) * 100) : 0,
    }));
}

// ─── Tabla del home ──────────────────────────────────────────────────────────
// Ordenada por %V, con mínimo de PJ si ya hay suficientes partidos totales

export function statsParaHome(
  allStats: PlayerStats[],
  totalPartidos: number
): PlayerStats[] {
  const MIN_PARTIDOS_TOTALES = 5; // hasta que no haya 5 partidos, no se aplica el filtro
  const MIN_PJ_JUGADOR = 3;       // mínimo de partidos para aparecer en la tabla del home

  const aplicarFiltro = totalPartidos >= MIN_PARTIDOS_TOTALES;

  return allStats
    .filter((s) => !aplicarFiltro || s.pj >= MIN_PJ_JUGADOR)
    .sort((a, b) => b.pctV - a.pctV)
    .slice(0, 10);
}

// ─── Estadísticas de grupo (2+ jugadores jugando juntos) ────────────────────

export type GrupoStats = {
  // Partidos donde todos los jugadores seleccionados estuvieron en el mismo equipo
  juntos: {
    pj: number;
    v: number;
    e: number;
    d: number;
    pctV: number;
    pctD: number;
  };
  // Para cada jugador: qué % de sus partidos totales los jugó con el grupo
  participacion: Record<
    number,
    {
      playerId: number;
      nombre: string;
      apodo: string | null;
      pjConGrupo: number;    // partidos jugados junto al grupo
      pjTotal: number;       // partidos jugados en total (con el filtro activo)
      pctConGrupo: number;   // pjConGrupo / pjTotal * 100
    }
  >;
  // Stats individuales de cada jugador (útil para mostrar tabla comparativa)
  statsIndividuales: PlayerStats[];
};

// Recibe los stats ya calculados y los raw stats para cruzarlos
export function calcularStatsGrupo(
  playerIds: number[],
  rawStats: RawStat[]
): GrupoStats {
  if (playerIds.length < 2) {
    throw new Error("Se necesitan al menos 2 jugadores para comparar");
  }

  // Armar mapa: matchId → teamId → Set de playerIds en ese equipo
  const matchTeamPlayers = new Map<string, Set<number>>();
  // clave: `${matchId}-${teamId}`

  for (const stat of rawStats) {
    const matchId = stat.team.match.id;
    const teamId = (stat.team as any).id;
    const key = `${matchId}-${teamId}`;

    if (!matchTeamPlayers.has(key)) {
      matchTeamPlayers.set(key, new Set());
    }
    matchTeamPlayers.get(key)!.add(stat.player.id);
  }

  // Encontrar los equipos donde TODOS los jugadores seleccionados estuvieron juntos
  const equiposJuntos: Array<{ resultado: string; matchId: number }> = [];
  const setSeleccionados = new Set(playerIds);

  for (const [key, playersEnEquipo] of matchTeamPlayers.entries()) {
    // Verificar que todos los seleccionados estén en este equipo
    const todosPresentes = playerIds.every((id) => playersEnEquipo.has(id));
    if (!todosPresentes) continue;

    // Buscar el resultado de este equipo
    const [matchIdStr] = key.split("-");
    const matchId = Number(matchIdStr);

    // Tomar el resultado del primer jugador seleccionado en este equipo
    const statDeReferencia = rawStats.find(
      (s) =>
        s.team.match.id === matchId &&
        (s.team as any).id === Number(key.split("-")[1]) &&
        playerIds.includes(s.player.id)
    );

    if (statDeReferencia) {
      equiposJuntos.push({
        resultado: statDeReferencia.team.resultado,
        matchId,
      });
    }
  }

  // Calcular stats del grupo jugando juntos
  const juntos = { pj: 0, v: 0, e: 0, d: 0, pctV: 0, pctD: 0 };
  const matchIdsJuntos = new Set(equiposJuntos.map((e) => e.matchId));

  for (const eq of equiposJuntos) {
    juntos.pj++;
    if (eq.resultado === "WIN") juntos.v++;
    else if (eq.resultado === "DRAW") juntos.e++;
    else juntos.d++;
  }

  juntos.pctV = juntos.pj > 0 ? Math.round((juntos.v / juntos.pj) * 100) : 0;
  juntos.pctD = juntos.pj > 0 ? Math.round((juntos.d / juntos.pj) * 100) : 0;

  // Calcular participación: cuántos partidos totales jugó cada uno vs cuántos con el grupo
  const pjPorJugador = new Map<number, number>();
  const infoJugador = new Map<number, { nombre: string; apodo: string | null }>();

  for (const stat of rawStats) {
    if (!playerIds.includes(stat.player.id)) continue;
    const id = stat.player.id;
    pjPorJugador.set(id, (pjPorJugador.get(id) ?? 0) + 1);
    if (!infoJugador.has(id)) {
      infoJugador.set(id, { nombre: stat.player.nombre, apodo: stat.player.apodo });
    }
  }

  const participacion: GrupoStats["participacion"] = {};
  for (const id of playerIds) {
    const pjTotal = pjPorJugador.get(id) ?? 0;
    const info = infoJugador.get(id) ?? { nombre: "Desconocido", apodo: null };
    participacion[id] = {
      playerId: id,
      nombre: info.nombre,
      apodo: info.apodo,
      pjConGrupo: matchIdsJuntos.size,
      pjTotal,
      pctConGrupo: pjTotal > 0 ? Math.round((matchIdsJuntos.size / pjTotal) * 100) : 0,
    };
  }

  // Stats individuales de cada jugador seleccionado (con el filtro activo)
  const statsIndividuales = calcularStats(
    rawStats.filter((s) => playerIds.includes(s.player.id))
  );

  return { juntos, participacion, statsIndividuales };
}
