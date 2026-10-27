"use client";

import { useState } from "react";
import { emptyMatchFilters, type MatchFiltersValue } from "@/features/matches/filters";

export { emptyMatchFilters, type MatchFiltersValue } from "@/features/matches/filters";

type PlayerOption = { id: number; name: string };
type VenueOption = { id: number; name: string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").trim();
}

export default function MatchFilters({ value, onChange, players, venues, formats, defaultOpen = false }: {
  value: MatchFiltersValue;
  onChange: (value: MatchFiltersValue) => void;
  players: PlayerOption[];
  venues: VenueOption[];
  formats: number[];
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const selected = players.filter(player => value.playerIds.includes(player.id));
  const options = players.filter(player => !value.playerIds.includes(player.id) && normalize(player.name).includes(normalize(query)));
  const activeCount = [value.dateFrom || value.dateTo, value.format, value.venueId, value.playerIds.length > 0].filter(Boolean).length;

  function setPlayers(ids: number[]) {
    onChange({ ...value, playerIds: ids, sameTeam: ids.length >= 2 && value.sameTeam });
  }

  return <details className="card match-filters" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>Filtrar partidos <span>{activeCount ? `${activeCount} ${activeCount === 1 ? "filtro" : "filtros"}` : "Todos los partidos"}</span></summary>
    <div className="match-filter-fields">
      <label className="field">Desde<input type="date" value={value.dateFrom} max={value.dateTo || undefined} onChange={event => onChange({ ...value, dateFrom: event.target.value })} /></label>
      <label className="field">Hasta<input type="date" value={value.dateTo} min={value.dateFrom || undefined} onChange={event => onChange({ ...value, dateTo: event.target.value })} /></label>
      <label className="field">Formato<select aria-label="Formato" value={value.format} onChange={event => onChange({ ...value, format: event.target.value })}><option value="">Todos</option>{formats.map(format => <option key={format} value={format}>F{format}</option>)}</select></label>
      <label className="field">Cancha<select value={value.venueId} onChange={event => onChange({ ...value, venueId: event.target.value })}><option value="">Todas las canchas</option>{venues.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
    </div>
    <fieldset className="match-filter-players">
      <legend>Jugadores</legend>
      <p className="match-filter-help">El partido debe incluir a todos los jugadores que selecciones.</p>
      {selected.length > 0 && <div className="selected-list">{selected.map(player => <button type="button" className="pill selected-player" aria-label={`Quitar a ${player.name}`} key={player.id} onClick={() => setPlayers(value.playerIds.filter(id => id !== player.id))}>{player.name}<span aria-hidden="true"> ×</span></button>)}</div>}
      <label className="field">Buscar y agregar jugadores<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o apodo" /></label>
      <div className="player-options match-filter-options" aria-label="Jugadores disponibles">
        {options.map(player => <button type="button" className="player-option" key={player.id} onClick={() => { setPlayers([...value.playerIds, player.id]); setQuery(""); }}><span>{player.name}</span><span aria-hidden="true">+</span></button>)}
        {options.length === 0 && <p className="match-filter-help">No hay jugadores disponibles para esta búsqueda.</p>}
      </div>
      <label className="same-team-control"><input type="checkbox" checked={value.sameTeam} disabled={value.playerIds.length < 2} onChange={event => onChange({ ...value, sameTeam: event.target.checked })} /><span>Comparten equipo<small>{value.playerIds.length < 2 ? "Seleccioná al menos dos jugadores." : "Todos los seleccionados jugaron en el mismo equipo."}</small></span></label>
    </fieldset>
    <button className="button" type="button" onClick={() => { onChange(emptyMatchFilters()); setQuery(""); }}>Limpiar filtros</button>
  </details>;
}
