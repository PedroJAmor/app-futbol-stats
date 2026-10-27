"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlayerTableRow } from "@/components/players/PlayerLink";
import { lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
import type { PlayerStats } from "@/lib/stats";

type SortColumn = "pj" | "v" | "e" | "d" | "pts" | "pctV" | "pctD";
type GroupStats = {
  together: { pj: number; v: number; e: number; d: number; pctV: number; pctD: number };
  participation: Record<string, { playerId: number; matchesWithGroup: number; totalMatches: number; percentage: number }>;
  individual: PlayerStats[];
  headToHead: { pj: number; v: number; e: number; d: number; pctV: number } | null;
};

const columns: { key: SortColumn; label: string }[] = [
  { key: "pj", label: "PJ" }, { key: "v", label: "V" }, { key: "e", label: "E" },
  { key: "d", label: "D" }, { key: "pts", label: "Pts" },
  { key: "pctV", label: "%V" }, { key: "pctD", label: "%D" },
];

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerStats[]>([]);
  const [format, setFormat] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minimumMatches, setMinimumMatches] = useState("0");
  const [sortColumn, setSortColumn] = useState<SortColumn>("pts");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<number[]>([]);
  const [comparisonQuery, setComparisonQuery] = useState("");
  const [comparisonPickerOpen, setComparisonPickerOpen] = useState(false);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [playersError, setPlayersError] = useState("");
  const [comparisonError, setComparisonError] = useState("");
  const [statsRetry, setStatsRetry] = useState(0);
  const [playersRetry, setPlayersRetry] = useState(0);
  const comparisonSection = useRef<HTMLElement>(null);
  const pickerTrigger = useRef<HTMLButtonElement>(null);
  const compareButton = useRef<HTMLButtonElement>(null);
  const comparisonAbort = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    if (!comparisonPickerOpen) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: "fixed", top: `-${scrollY}px`, left: `-${scrollX}px`, width: "100%", overflow: "hidden" });
    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(scrollX, scrollY);
      pickerTrigger.current?.focus({ preventScroll: true });
      // Selected chips can increase the height above the action. Keep the action
      // reachable without jumping back to the input that opened the sheet.
      compareButton.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    };
  }, [comparisonPickerOpen]);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minimumMatches && minimumMatches !== "0") params.set("minimumMatches", minimumMatches);
    return params;
  }, [dateFrom, dateTo, format, minimumMatches]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setStatsError("");
    async function load() {
      try {
        const response = await fetch(`/api/stats?${filterParams}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.stats)) throw new Error(data.error ?? "No se pudieron cargar las estadísticas.");
        if (!controller.signal.aborted) setStats(data.stats);
      } catch (cause) {
        if (!controller.signal.aborted) setStatsError(cause instanceof Error ? cause.message : "No se pudieron cargar las estadísticas.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filterParams, statsRetry]);

  useEffect(() => {
    const controller = new AbortController();
    setPlayersError("");
    async function load() {
      try {
        const response = await fetch("/api/stats", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.stats)) throw new Error(data.error ?? "No se pudieron cargar los jugadores para comparar.");
        if (!controller.signal.aborted) setAllPlayers(data.stats);
      } catch (cause) {
        if (!controller.signal.aborted) setPlayersError(cause instanceof Error ? cause.message : "No se pudieron cargar los jugadores para comparar.");
      }
    }
    void load();
    return () => controller.abort();
  }, [playersRetry]);

  useEffect(() => {
    comparisonAbort.current?.abort();
    comparisonAbort.current = null;
    setGroupStats(null);
    setComparisonError("");
    setComparing(false);
    return () => { comparisonAbort.current?.abort(); comparisonAbort.current = null; };
  }, [filterParams, selected]);

  const sorted = useMemo(() => [...stats].sort((a, b) => {
    const difference = a[sortColumn] - b[sortColumn];
    return sortDirection === "asc" ? difference : -difference;
  }), [sortColumn, sortDirection, stats]);

  function sortBy(column: SortColumn) {
    if (sortColumn === column) setSortDirection((current) => current === "desc" ? "asc" : "desc");
    else { setSortColumn(column); setSortDirection("desc"); }
  }

  function togglePlayer(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setGroupStats(null);
  }

  async function compare() {
    if (selected.length < 2 || comparisonAbort.current) return;
    const controller = new AbortController();
    comparisonAbort.current = controller;
    setComparing(true);
    setComparisonError("");
    const params = new URLSearchParams(filterParams);
    params.delete("minimumMatches");
    params.set("ids", selected.join(","));
    try {
      const response = await fetch(`/api/stats/comparar?${params}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.together || !data.participation || !Array.isArray(data.individual)) throw new Error(data.error ?? "No se pudo calcular la comparación.");
      if (!controller.signal.aborted) setGroupStats(data);
    } catch (cause) {
      if (!controller.signal.aborted) setComparisonError(cause instanceof Error ? cause.message : "No se pudo calcular la comparación.");
    } finally {
      if (comparisonAbort.current === controller) { comparisonAbort.current = null; setComparing(false); }
    }
  }

  function resetFilters() {
    setFormat(""); setDateFrom(""); setDateTo(""); setMinimumMatches("0"); setGroupStats(null);
  }

  const playerById = new Map(allPlayers.map((player) => [player.playerId, player]));
  const repeatedGivenNames = useMemo(() => {
    const counts = allPlayers.reduce((result, player) => result.set(playerGivenNameKey(player), (result.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [allPlayers]);
  const compactName = (player: PlayerStats) => lineupPlayerName(player, repeatedGivenNames);
  const comparisonOptions = useMemo(() => {
    const search = comparisonQuery.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    return allPlayers
      .filter((player) => !selected.includes(player.playerId))
      .filter((player) => !search || [player.firstName, player.lastName, player.nickname, player.legacyFullName].filter(Boolean).join(" ").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(search))
      .sort((a, b) => b.pj - a.pj || compactName(a).localeCompare(compactName(b), "es"));
  }, [allPlayers, comparisonQuery, repeatedGivenNames, selected]);
  return <div className="page stats-page">
    <details className="stats-filters card">
      <summary>Filtrar estadísticas <span>{filterParams.size ? `${filterParams.size} ${filterParams.size === 1 ? "activo" : "activos"}` : "Todos los partidos"}</span></summary>
      <div className="form-grid">
        <label className="field">Formato<input type="number" min="1" value={format} onChange={(event) => setFormat(event.target.value)} placeholder="Todos" /></label>
        <label className="field">Desde<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="field">Hasta<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <label className="field">Mínimo de partidos<input type="number" min="0" value={minimumMatches} onChange={(event) => setMinimumMatches(event.target.value)} /></label>
      </div>
      <button className="button" type="button" onClick={resetFilters}>Limpiar filtros</button>
    </details>

    <button className="button comparison-jump" type="button" onClick={() => comparisonSection.current?.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Ir a comparar</button>

    <section className="stats-ranking stack"><div className="section-heading"><h2>Tabla de posiciones</h2><span className="muted">{loading ? "" : `${sorted.length} jugadores`}</span></div>
    {statsError && <div className="stack" role="alert"><p className="error">{statsError}</p><button className="button" type="button" onClick={() => setStatsRetry(current => current + 1)}>Reintentar estadísticas</button></div>}
    {loading ? <p className="muted" role="status">Cargando estadísticas...</p> : statsError ? null : sorted.length === 0 ? <p className="muted empty-state">No hay resultados para estos filtros.</p> : <div className="table-scroll"><table className="stats-table"><thead><tr><th>#</th><th>Jugador</th>{columns.map((column) => <th key={column.key} aria-sort={sortColumn === column.key ? sortDirection === "desc" ? "descending" : "ascending" : undefined}><button className="sort-button" type="button" onClick={() => sortBy(column.key)}>{column.label}{sortColumn === column.key ? sortDirection === "desc" ? " ↓" : " ↑" : ""}</button></th>)}</tr></thead><tbody>{sorted.map((stat, index) => <PlayerTableRow key={stat.playerId} playerId={stat.playerId} name={compactName(stat)} leading={index + 1}><td>{stat.pj}</td><td>{stat.v}</td><td>{stat.e}</td><td>{stat.d}</td><td>{stat.pts}</td><td>{stat.pctV}%</td><td>{stat.pctD}%</td></PlayerTableRow>)}</tbody></table></div>}</section>

    <section ref={comparisonSection} className="stack comparison-section" id="comparar-jugadores">
      <h2>Comparar jugadores</h2>
      {playersError && <div className="stack" role="alert"><p className="error">{playersError}</p><button className="button" type="button" onClick={() => setPlayersRetry(current => current + 1)}>Reintentar jugadores</button></div>}
      <div className="selected-list">{selected.map((id) => { const player = playerById.get(id); return <button type="button" className="pill selected-player" onClick={() => togglePlayer(id)} key={id}>{player ? compactName(player) : id} ×</button>; })}</div>
      <div className="comparison-picker"><button ref={pickerTrigger} className="search-field comparison-picker-trigger" type="button" aria-haspopup="dialog" aria-expanded={comparisonPickerOpen} onClick={() => setComparisonPickerOpen(true)}><span aria-hidden="true">⌕</span><span>Buscar y agregar jugador</span></button>{comparisonPickerOpen && <><button className="comparison-sheet-backdrop" type="button" aria-label="Cerrar selector de jugadores" onClick={() => setComparisonPickerOpen(false)} /><section className="comparison-sheet" role="dialog" aria-modal="true" aria-labelledby="comparison-picker-title"><div className="comparison-sheet-header"><h3 id="comparison-picker-title">Agregar jugador</h3><button className="button" type="button" onClick={() => setComparisonPickerOpen(false)}>Cerrar</button></div><label className="search-field"><span aria-hidden="true">⌕</span><input value={comparisonQuery} autoFocus onChange={(event) => setComparisonQuery(event.target.value)} placeholder="Buscar por nombre o apodo" aria-label="Buscar jugador para comparar" /></label><div className="comparison-selection" aria-label="Jugadores seleccionados"><p role="status" aria-live="polite">{selected.length ? `${selected.length} ${selected.length === 1 ? "jugador seleccionado" : "jugadores seleccionados"}` : "Todavía no seleccionaste jugadores"}</p><div className="selected-list">{selected.map(id => { const player = playerById.get(id); const name = player ? compactName(player) : String(id); return <button type="button" className="pill selected-player" key={id} aria-label={`Quitar a ${name} de la comparación`} onClick={() => togglePlayer(id)}>{name}<span aria-hidden="true"> ×</span></button>; })}</div></div><div className="player-options">{comparisonOptions.map((player) => <button type="button" className="player-option" key={player.playerId} onClick={() => { togglePlayer(player.playerId); setComparisonQuery(""); }}><span>{compactName(player)}</span><small>{player.pj} PJ</small></button>)}{comparisonOptions.length === 0 && <p className="muted comparison-empty">No hay jugadores disponibles.</p>}</div></section></>}</div>
      {selected.length >= 2 && <button ref={compareButton} className="button primary comparison-submit" type="button" disabled={comparing} onClick={compare}>{comparing ? "Calculando..." : comparisonError ? "Reintentar comparación" : "Comparar jugadores"}</button>}
      {comparisonError && <p className="error" role="alert">{comparisonError}</p>}
      {groupStats && <Comparison stats={groupStats} playerById={playerById} selected={selected} />}
    </section>
  </div>;
}

function Comparison({ stats, playerById, selected }: { stats: GroupStats; playerById: Map<number, PlayerStats>; selected: number[] }) {
  const counts = [...playerById.values()].reduce((result, player) => result.set(playerGivenNameKey(player), (result.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
  const repeatedGivenNames = new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  const name = (id: number) => {
    const player = playerById.get(id);
    return player ? lineupPlayerName(player, repeatedGivenNames) : String(id);
  };
  const headToHeadRows = stats.headToHead && selected.length === 2 ? [
    { id: selected[0], v: stats.headToHead.v, e: stats.headToHead.e, d: stats.headToHead.d, pctV: stats.headToHead.pctV },
    { id: selected[1], v: stats.headToHead.d, e: stats.headToHead.e, d: stats.headToHead.v, pctV: stats.headToHead.pj ? Math.round((stats.headToHead.d / stats.headToHead.pj) * 100) : 0 },
  ] : [];
  return <div className="stack card">
    <h3>Cuando jugaron juntos</h3>
    <div className="table-scroll"><table className="comparison-table"><thead><tr><th>Grupo</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>%V</th><th>%D</th></tr></thead><tbody><tr><td>Juntos</td><td>{stats.together.pj}</td><td>{stats.together.v}</td><td>{stats.together.e}</td><td>{stats.together.d}</td><td>{stats.together.pctV}%</td><td>{stats.together.pctD}%</td></tr></tbody></table></div>
    <h3>Participación cruzada</h3>
    <div className="table-scroll"><table className="comparison-table participation-table"><thead><tr><th>Jugador</th><th>PJ total</th><th>Juntos</th><th>% juntos</th></tr></thead><tbody>{Object.values(stats.participation).map((item) => <PlayerTableRow key={item.playerId} playerId={item.playerId} name={name(item.playerId)}><td>{item.totalMatches}</td><td>{item.matchesWithGroup}</td><td>{item.percentage}%</td></PlayerTableRow>)}</tbody></table></div>
    {headToHeadRows.length > 0 && <><h3>Head to head</h3><p className="section-note">Partidos en los que estuvieron en equipos rivales.</p><div className="table-scroll"><table className="comparison-table"><thead><tr><th>Jugador</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>%V</th></tr></thead><tbody>{headToHeadRows.map((row) => <PlayerTableRow key={row.id} playerId={row.id} name={name(row.id)}><td>{stats.headToHead!.pj}</td><td>{row.v}</td><td>{row.e}</td><td>{row.d}</td><td>{row.pctV}%</td></PlayerTableRow>)}</tbody></table></div></>}
    <h3>Estadísticas individuales</h3>
    <div className="table-scroll"><table className="comparison-individual-table"><thead><tr><th>Jugador</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>Pts</th><th>%V</th><th>%D</th></tr></thead><tbody>{stats.individual.map((stat) => <PlayerTableRow key={stat.playerId} playerId={stat.playerId} name={name(stat.playerId)}><td>{stat.pj}</td><td>{stat.v}</td><td>{stat.e}</td><td>{stat.d}</td><td>{stat.pts}</td><td>{stat.pctV}%</td><td>{stat.pctD}%</td></PlayerTableRow>)}</tbody></table></div>
  </div>;
}
