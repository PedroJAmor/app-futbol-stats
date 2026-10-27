"use client";

import { useState } from "react";
import Link from "next/link";
import MatchFilters, { emptyMatchFilters } from "@/components/matches/MatchFilters";

const players = [
  { id: 1, name: "Martín Pérez" },
  { id: 2, name: "Lucas Gómez" },
  { id: 3, name: "Santiago Díaz" },
  { id: 4, name: "Federico Benítez (Fede)" },
];
const venues = [{ id: 1, name: "Rebote" }, { id: 2, name: "La Avenida" }];

export default function FiltersPreview() {
  const [value, setValue] = useState(emptyMatchFilters);
  return <div className="page match-filter-preview">
    <div className="page-intro"><p className="eyebrow">Revisión visual · datos ficticios</p><h1>Filtros de partidos</h1><p className="muted">Probá los controles y la selección de jugadores. Esta muestra no consulta ni filtra los partidos reales.</p><Link className="back-link" href="/partidos">Volver a Partidos →</Link></div>
    <MatchFilters value={value} onChange={setValue} players={players} venues={venues} formats={[5, 7, 8]} defaultOpen />
    <section className="card" aria-live="polite"><h2>Selección para revisar</h2><p className="filter-selection-summary">{value.playerIds.length ? `${value.playerIds.length} ${value.playerIds.length === 1 ? "jugador seleccionado" : "jugadores seleccionados"}${value.sameTeam ? ", todos en el mismo equipo" : ", en cualquiera de los equipos"}.` : "Sin jugadores seleccionados."}</p></section>
  </div>;
}
