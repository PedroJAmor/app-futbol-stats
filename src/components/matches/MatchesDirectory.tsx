"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import MatchEditor from "./MatchEditor";
import MatchFilters from "./MatchFilters";
import { emptyMatchFilters, parseMatchFilters, serializeMatchFilters } from "@/features/matches/filters";

type MatchItem = Parameters<typeof MatchCard>[0]["match"];
type FilterProps = Pick<Parameters<typeof MatchFilters>[0], "formats" | "venues" | "players">;

export default function MatchesDirectory({ matches, formats, venues, players }: { matches: MatchItem[] } & FilterProps) {
  const { data: session } = useSession();
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState(emptyMatchFilters);
  const [filteredMatches, setFilteredMatches] = useState(matches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const restoringRef = useRef(false);
  const router = useRouter();
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  const hasFilters = Boolean(filters.dateFrom || filters.dateTo || filters.format || filters.venueId || filters.playerIds.length);
  const showHidden = isAdmin && includeHidden;
  const needsQuery = hasFilters || showHidden;

  useEffect(() => {
    setError("");
    if (!needsQuery) {
      setFilteredMatches(matches);
      setLoading(false);
      return;
    }
    const params = serializeMatchFilters(filters);
    try {
      parseMatchFilters(params);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Revisá los filtros.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    // Let consecutive selections settle; obsolete responses never replace newer results.
    const timer = window.setTimeout(async () => {
      try {
        params.set("view", "cards");
        if (showHidden) params.set("includeHidden", "1");
        const response = await fetch(`/api/partidos?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los partidos.");
        if (!Array.isArray(data)) throw new Error("No se pudieron cargar los partidos.");
        if (!controller.signal.aborted) setFilteredMatches(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los partidos.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, needsQuery, showHidden, matches, retry]);

  const visibleMatches = (needsQuery ? filteredMatches : matches).filter(match => showHidden || !match.isHidden);
  async function restoreMatch(id: number) {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(id);
    setRestoreError("");
    try {
      const response = await fetch(`/api/partidos/${id}`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo restaurar el partido.");
      setFilteredMatches(current => current.map(match => match.id === id ? { ...match, isHidden: false } : match));
      setRetry(current => current + 1);
      router.refresh();
    } catch (cause) {
      setRestoreError(cause instanceof Error ? cause.message : "No se pudo restaurar el partido.");
    } finally {
      restoringRef.current = false;
      setRestoring(null);
    }
  }
  return <>
    <section className="directory-heading">
      <p className="directory-count" role="status" aria-live="polite">{loading ? "Actualizando partidos…" : error ? "No se pudo actualizar el listado" : showHidden ? `${visibleMatches.length} partidos, incluidos ocultos` : hasFilters ? `${visibleMatches.length} de ${matches.length} partidos` : `${matches.length} partidos jugados`}</p>
      {isAdmin && <button className="button primary" onClick={() => setCreating(true)}>+ Crear partido</button>}
    </section>
    <MatchFilters value={filters} onChange={setFilters} formats={formats} venues={venues} players={players} />
    {isAdmin && <label className="match-visibility-filter"><input type="checkbox" checked={includeHidden} onChange={event => setIncludeHidden(event.target.checked)} />Mostrar partidos ocultos</label>}
    {error && <div className="stack" role="alert"><p className="error">{error}</p><button className="button" type="button" onClick={() => setRetry(current => current + 1)}>Reintentar</button></div>}
    {restoreError && <p className="error" role="alert">{restoreError}</p>}
    <div className="matches-list" aria-busy={loading}>{visibleMatches.map(match => match.isHidden && isAdmin ? <div className="match-hidden-item" key={match.id}><MatchCard match={match} /><button className="button" type="button" disabled={restoring !== null} onClick={() => restoreMatch(match.id)}>{restoring === match.id ? "Restaurando…" : "Restaurar partido"}</button></div> : <MatchCard match={match} key={match.id} />)}</div>
    {!loading && !error && visibleMatches.length === 0 && <p className="muted empty-state">{hasFilters ? "No hay partidos para estos filtros." : "Todavía no hay partidos registrados."}</p>}
    {creating && <MatchEditor onClose={() => setCreating(false)} />}
  </>;
}
