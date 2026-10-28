"use client";
import { useEffect, useState } from "react";
import type { calculateGoalStats } from "@/features/stats/goals";
import "./stats-additions.css";

type Result = ReturnType<typeof calculateGoalStats>;
export default function GoalStats({ venueId, courtId }: { venueId?: number; courtId?: number }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setError("");
    const params = new URLSearchParams();
    if (venueId) params.set("venueId", String(venueId));
    if (courtId) params.set("courtId", String(courtId));
    async function load() {
      try {
        const response = await fetch(`/api/stats/arcos?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.venues)) throw new Error(result.error ?? "No se pudieron cargar las estadísticas por arco.");
        if (!controller.signal.aborted) setData(result);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las estadísticas por arco."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [open, venueId, courtId, retry]);
  return <details className="goal-stats stack" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Estadísticas por arco</summary>
    {open && <div className="stack goal-stats-content">
      {loading ? <p className="muted" role="status">Cargando estadísticas por arco…</p> : error ? <div role="alert"><p className="error">{error}</p><button className="button" onClick={() => setRetry(value => value + 1)}>Reintentar estadísticas por arco</button></div> : data && <>
        {data.unassignedVenueMatches > 0 && <p className="muted">{data.unassignedVenueMatches} partidos sin predio asignado quedan fuera del análisis por arco.</p>}
        {!data.venues.length && <p className="muted">No hay predios registrados.</p>}
        {data.venues.map(venue => <section className="goal-venue stack" key={venue.id}><h3>{venue.name}</h3>
          {venue.pendingMatches > 0 && <p className="muted">{venue.pendingMatches} partidos pendientes de asignación completa{venue.unassignedMatches ? ` (${venue.unassignedMatches} sin cancha especificada)` : ""}.</p>}
          {!venue.courts.length && <p className="muted">Todavía no hay canchas configuradas.</p>}
          {venue.courts.map(court => <section className="card stack goal-court" key={court.id}><h4>{court.name}</h4>
            {court.matches > 0 ? <><div className="goal-results" role="table" aria-label={`Resultados por arco de ${court.name}`}><div className="goal-results-row" role="row">{[court.goals[0].name, "Empate", court.goals[1].name].map((label, index) => <div role="cell" key={index}><span>{label}</span><strong>{court.percentages[index]}%</strong><small>{court.counts[index]} {court.counts[index] === 1 ? "partido" : "partidos"}</small></div>)}</div></div><p className="muted">{court.matches} {court.matches === 1 ? "partido analizado" : "partidos analizados"}.</p></> : <p className="muted">Sin partidos con lados completos.</p>}
            {court.pendingMatches > 0 && <p className="muted">{court.pendingMatches} partidos de esta cancha sin lados completos.</p>}
          </section>)}
        </section>)}
      </>}
    </div>}
  </details>;
}
