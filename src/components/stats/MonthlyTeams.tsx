"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
import type { PlayerStats } from "@/lib/stats";
import "./stats-additions.css";

type MonthlyResult = { month: string; months: string[]; candidateCount: number; best: (PlayerStats & { score: number })[]; worst: (PlayerStats & { score: number })[] };
const monthLabel = (month: string) => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00-03:00`));

function useMonthlyResult(month = "", enabled = true) {
  const [data, setData] = useState<MonthlyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
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
  }, [month, enabled, retry]);
  return { data, loading, error, retry: () => setRetry(value => value + 1) };
}

function TeamLists({ data }: { data: MonthlyResult }) {
  const repeatedGivenNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const player of [...data.best, ...data.worst]) {
      const key = playerGivenNameKey(player); counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
  }, [data]);
  if (data.candidateCount === 0) return <p className="muted empty-state">No hay partidos registrados en {monthLabel(data.month)}.</p>;
  return <>
    <p className="muted">{data.candidateCount} jugadores</p>
    <div className="monthly-grid">{([['Mejor equipo', data.best], ['Peor equipo', data.worst]] as const).map(([title, players]) => <section className="card stack monthly-team" key={title}><div className="section-heading"><h3>{title}</h3><span>V − D</span></div><ol>
      {players.map(player => <li key={player.playerId}><Link href={`/jugadores/${player.playerId}`}><span>{lineupPlayerName(player, repeatedGivenNames)}</span><small>{player.pj} PJ</small><strong>{player.score > 0 ? "+" : ""}{player.score}</strong></Link></li>)}
    </ol>{players.length === 0 && <p className="muted">Sin candidatos disponibles.</p>}</section>)}</div>
    {data.candidateCount < 14 && <p className="muted">Este mes hay menos de 14 jugadores; las listas quedan incompletas para no repetir nombres.</p>}
  </>;
}

function MonthlyContent({ result }: { result: ReturnType<typeof useMonthlyResult> }) {
  return result.loading ? <p role="status" className="muted">Cargando equipos del mes…</p> : result.error ? <div role="alert"><p className="error">{result.error}</p><button className="button" onClick={result.retry}>Reintentar equipos del mes</button></div> : result.data ? <TeamLists data={result.data} /> : null;
}

function ArchivedMonth({ month, initiallyOpen }: { month: string; initiallyOpen: boolean }) {
  // Keep loaded months mounted when closed, so reopening never refetches or loses other months.
  const [activated, setActivated] = useState(initiallyOpen);
  const result = useMonthlyResult(month, activated);
  return <details className="monthly-month" open={initiallyOpen || undefined} onToggle={event => { if (event.currentTarget.open) setActivated(true); }}>
    <summary className="card monthly-month-card"><span>{monthLabel(month)}</span><span className="monthly-toggle" aria-hidden="true">+</span></summary>
    {activated && <div className="monthly-month-content stack"><MonthlyContent result={result} /></div>}
  </details>;
}

export default function MonthlyTeams({ month = "" }: { month?: string }) {
  const result = useMonthlyResult();
  return <section className="monthly-teams stack" aria-label="Equipos del mes">
    {result.data && <h2 className="monthly-caption">{monthLabel(result.data.month)}</h2>}
    <MonthlyContent result={result} />
    {result.data && result.data.months.some(item => item < result.data!.month) && <section className="stack monthly-archive" aria-label="Meses anteriores">
      <h2>Meses anteriores</h2>
      {result.data.months.filter(item => item < result.data!.month).map(item => <ArchivedMonth key={item} month={item} initiallyOpen={item === month} />)}
    </section>}
  </section>;
}
