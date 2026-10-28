"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
import type { PlayerStats } from "@/lib/stats";
import "./stats-additions.css";

type MonthlyResult = { month: string; months: string[]; candidateCount: number; best: (PlayerStats & { score: number })[]; worst: (PlayerStats & { score: number })[] };
const monthLabel = (month: string) => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00-03:00`));

export default function MonthlyTeams() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<MonthlyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    async function load() {
      try {
        const response = await fetch(`/api/stats/equipos-mes?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.best) || !Array.isArray(result.worst) || !Array.isArray(result.months) || !/^\d{4}-\d{2}$/.test(result.month)) throw new Error(result.error ?? "No se pudieron cargar los equipos del mes.");
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los equipos del mes.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [month, retry]);
  const repeatedGivenNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const player of [...(data?.best ?? []), ...(data?.worst ?? [])]) {
      const key = playerGivenNameKey(player); counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
  }, [data]);
  return <section className="monthly-teams stack" aria-labelledby="monthly-title">
    <div className="section-heading"><h2 id="monthly-title">Equipos del mes</h2></div>
    <div className="card stack">
      <label className="field">Mes cerrado<select value={month || data?.month || ""} disabled={!data} onChange={event => setMonth(event.target.value)}>
        {!data && <option value="">Cargando meses…</option>}
        {data?.months.map(item => <option key={item} value={item}>{monthLabel(item)}</option>)}
      </select></label>
    </div>
    {loading ? <p role="status" className="muted">Cargando equipos del mes…</p> : error ? <div role="alert"><p className="error">{error}</p><button className="button" onClick={() => setRetry(value => value + 1)}>Reintentar equipos del mes</button></div> : data && <>
      {data.candidateCount === 0 ? <p className="muted empty-state">No hay partidos registrados en {monthLabel(data.month)}. Podés elegir otro mes cerrado.</p> : <>
        <p className="muted monthly-caption">{monthLabel(data.month)} · {data.candidateCount} jugadores</p>
        <div className="monthly-grid">{([['Mejor equipo', 'V − D', data.best], ['Peor equipo', 'D − V', data.worst]] as const).map(([title, formula, players]) => <section className="card stack monthly-team" key={title}><div className="section-heading"><h3>{title}</h3><span>{formula}</span></div><ol>
          {players.map(player => <li key={player.playerId}><Link href={`/jugadores/${player.playerId}`}><span>{lineupPlayerName(player, repeatedGivenNames)}</span><small>{player.pj} PJ</small><strong>{player.score > 0 ? "+" : ""}{player.score}</strong></Link></li>)}
        </ol>{players.length === 0 && <p className="muted">Sin candidatos disponibles.</p>}</section>)}</div>
        {data.candidateCount < 14 && <p className="muted">Este mes hay menos de 14 jugadores; las listas quedan incompletas para no repetir nombres.</p>}
      </>}
    </>}
  </section>;
}
