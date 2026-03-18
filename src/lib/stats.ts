// src/lib/stats.ts
// Toda la logica de estadisticas: puntos, porcentajes, filtros y comparacion de jugadores

export const PUNTOS = { WIN: 4, DRAW: 2, LOSS: 1 } as const;

// ---- Tipos ----

export type PlayerStats = {
  playerId: number;
  nombre: string;
  apodo: string | null;
  foto: string | null;
  pj: number;
  v: number;
  e: number;
  d: number;
  pts: number;
  pctV: number;
  pctD: number;
};

export type StatsFilter = {
  formato?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  pjMinimo?: number;
};

export type RawStat = {
  player: { id: number; nombre: string; apodo: string | null; foto: string | null };
  team: {
    id: number;
    resultado: string;
    match: { id: number; formato: number; fecha: Date };
  };
};

export type GrupoStats = {
  juntos: {
    pj: number;
    v: number;
    e: number;
    d: number;
    pctV: number;
    pctD: number;
  };
  participacion: Record<
    number,
    {
      playerId: number;
      nombre: string;
      apodo: string | null;
      pjConGrupo: number;
      pjTotal: number;
      pctConGrupo: number;
    }
  >;
  statsIndividuales: PlayerStats[];
  // Solo cuando son exactamente 2 jugadores
  h2h: {
    pj: number;
    v: number;    // victorias del jugador [0]
    e: number;
    d: number;    // derrotas del jugador [0] = victorias del [1]
    pctV: number;
    jugadores: [
      { playerId: number; nombre: string; apodo: string | null },
      { playerId: number; nombre: string; apodo: string | null }
    ];
  } | null;
};

// ---- Filtro para queries de Prisma ----

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
      const hasta = new Date(filter.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      matchWhere.fecha.lte = hasta;
    }
  }

  return matchWhere;
}

// ---- Calculo de estadisticas individuales ----

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

// ---- Tabla del home ----

export function statsParaHome(
  allStats: PlayerStats[],
  totalPartidos: number
): PlayerStats[] {
  const MIN_PARTIDOS_TOTALES = 10;
  const MIN_PJ_JUGADOR = 5;
  const aplicarFiltro = totalPartidos >= MIN_PARTIDOS_TOTALES;

  return allStats
    .filter((s) => !aplicarFiltro || s.pj >= MIN_PJ_JUGADOR)
    .sort((a, b) => b.pctV - a.pctV)
    .slice(0, 10);
}

// ---- Estadisticas de grupo (2+ jugadores juntos) ----

export function calcularStatsGrupo(
  playerIds: number[],
  rawStats: RawStat[]
): GrupoStats {
  if (playerIds.length < 2) {
    throw new Error("Se necesitan al menos 2 jugadores para comparar");
  }

  // Mapa: "${matchId}-${teamId}" -> Set de playerIds en ese equipo
  const matchTeamPlayers = new Map<string, Set<number>>();

  for (const stat of rawStats) {
    const key = `${stat.team.match.id}-${stat.team.id}`;
    if (!matchTeamPlayers.has(key)) {
      matchTeamPlayers.set(key, new Set());
    }
    matchTeamPlayers.get(key)!.add(stat.player.id);
  }

  // Partidos donde TODOS los seleccionados estuvieron en el mismo equipo
  const equiposJuntos: Array<{ resultado: string; matchId: number }> = [];

  for (const [key, playersEnEquipo] of Array.from(matchTeamPlayers.entries())) {
    const todosPresentes = playerIds.every((id) => playersEnEquipo.has(id));
    if (!todosPresentes) continue;

    const [matchIdStr, teamIdStr] = key.split("-");
    const matchId = Number(matchIdStr);
    const teamId = Number(teamIdStr);

    const statRef = rawStats.find(
      (s) => s.team.match.id === matchId && s.team.id === teamId && playerIds.includes(s.player.id)
    );

    if (statRef) {
      equiposJuntos.push({ resultado: statRef.team.resultado, matchId });
    }
  }

  // Stats del grupo jugando juntos
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

  // Participacion cruzada
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

  // Stats individuales
  const statsIndividuales = calcularStats(
    rawStats.filter((s) => playerIds.includes(s.player.id))
  );

  // ---- Head to head (solo para 2 jugadores) ----
  let h2h: GrupoStats["h2h"] = null;

  if (playerIds.length === 2) {
    const [idA, idB] = playerIds;

    const infoA = infoJugador.get(idA) ?? { nombre: "Jugador A", apodo: null };
    const infoB = infoJugador.get(idB) ?? { nombre: "Jugador B", apodo: null };

    // Agrupar stats por partido y equipo para encontrar enfrentamientos
    // matchId -> { teamId -> playerIds[] }
    const matchTeams = new Map<number, Map<number, number[]>>();

    for (const stat of rawStats) {
      const matchId = stat.team.match.id;
      if (!matchTeams.has(matchId)) matchTeams.set(matchId, new Map());
      const teams = matchTeams.get(matchId)!;
      if (!teams.has(stat.team.id)) teams.set(stat.team.id, []);
      teams.get(stat.team.id)!.push(stat.player.id);
    }

    let h2hPj = 0, h2hV = 0, h2hE = 0, h2hD = 0;

    for (const [matchId, teams] of Array.from(matchTeams.entries())) {
      const teamEntries = Array.from(teams.entries());

      // Buscar el equipo de A y el equipo de B en este partido
      const teamDeA = teamEntries.find(([, players]) => players.includes(idA));
      const teamDeB = teamEntries.find(([, players]) => players.includes(idB));

      // Si no estan en equipos distintos, no es enfrentamiento
      if (!teamDeA || !teamDeB) continue;
      if (teamDeA[0] === teamDeB[0]) continue; // mismo equipo, no cuenta

      h2hPj++;

      // Resultado desde la perspectiva de A
      const resultadoDeA = rawStats.find(
        (s) => s.team.match.id === matchId && s.team.id === teamDeA[0] && s.player.id === idA
      )?.team.resultado;

      if (resultadoDeA === "WIN") h2hV++;
      else if (resultadoDeA === "DRAW") h2hE++;
      else h2hD++;
    }

    h2h = {
      pj: h2hPj,
      v: h2hV,
      e: h2hE,
      d: h2hD,
      pctV: h2hPj > 0 ? Math.round((h2hV / h2hPj) * 100) : 0,
      jugadores: [
        { playerId: idA, nombre: infoA.nombre, apodo: infoA.apodo },
        { playerId: idB, nombre: infoB.nombre, apodo: infoB.apodo },
      ],
    };
  }

  return { juntos, participacion, statsIndividuales, h2h };
}
