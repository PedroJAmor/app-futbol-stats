"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";

import { matchInputSchema } from "@/features/matches/schemas";
import { validateMatchInput } from "@/features/matches/validators";
import { matchesPlayerSearch, updateTeamSelection, type TeamField } from "@/features/matches/editor";
import { ZodError } from "zod";
import { categoryLabels, matchCategories, suggestCategory, type Category } from "@/features/matches/categories";

type PlayerOption = {
  isActive: boolean;
  id: number;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  legacyFullName: string | null;
  _count: { participations: number };
};

type CourtOption = { id: number; name: string; format: number | null; goals: { id: number; name: string }[] };
type VenueOption = { id: number; name: string; courts?: CourtOption[] };

export type EditableMatch = {
  id: number;
  date: string;
  time: string;
  format: number;
  venueId: string;
  category?: Category | null;
  courtId?: string;
  aGoalId?: string;
  locationIsDemo?: boolean;
  price: string;
  weather: string;
  temperature: string;
  notes: string;
  mvpId: string;
  aColor: string;
  bColor: string;
  result: "A" | "B" | "DRAW";
  aPlayers: number[];
  bPlayers: number[];
};

const emptyMatch = (): Omit<EditableMatch, "id"> => ({ date: "", time: "21:00", format: 7, category: suggestCategory("", 7), venueId: "", courtId: "", aGoalId: "", price: "", weather: "", temperature: "", notes: "", mvpId: "", aColor: "Oscuro", bColor: "Claro", result: "A", aPlayers: [], bPlayers: [] });

export default function MatchEditor({ match, onClose }: { match?: EditableMatch; onClose: () => void }) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [form, setForm] = useState(() => match ? { ...match, category: match.category ?? suggestCategory(match.date, match.format), courtId: match.courtId ?? "", aGoalId: match.aGoalId ?? "" } : emptyMatch());
  const categoryTouched = useRef(Boolean(match?.category));
  const [confirmLocation, setConfirmLocation] = useState(false);
  const [addingVenue, setAddingVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = dialogRef.current!;
    const focusable = () => Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'));
    (focusable()[0] ?? element).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!savingRef.current) closeRef.current();
      }
      if (event.key === "Tab") {
        const controls = focusable();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); element.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
      }
    };
    element.addEventListener("keydown", keydown);
    return () => {
      element.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const repeatedGivenNames = useMemo(() => {
    const counts = players.reduce((result, player) => result.set(playerGivenNameKey(player), (result.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [players]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    async function loadOptions(url: string) {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("No se pudieron cargar jugadores y canchas.");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("No se pudieron cargar jugadores y canchas.");
      return data;
    }
    Promise.all([loadOptions("/api/jugadores?sort=popular"), loadOptions("/api/canchas")])
      .then(([playerOptions, venueOptions]) => {
        if (controller.signal.aborted) return;
        setPlayers(playerOptions);
        setVenues(venueOptions);
      }).catch(() => {
        if (!controller.signal.aborted) setLoadError("No se pudieron cargar jugadores y canchas.");
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadAttempt]);

  function toggle(side: TeamField, playerId: number, move = false) {
    setForm(current => updateTeamSelection(current, side, playerId, move));
  }

  const availableCourts = venues.find(venue => String(venue.id) === form.venueId)?.courts ?? [];
  const selectedCourt = availableCourts.find(court => String(court.id) === form.courtId);
  const opposingGoal = selectedCourt?.goals.find(goal => String(goal.id) !== form.aGoalId);
  function updateSchedule(change: { date?: string; format?: number }) {
    setForm(current => {
      const next = { ...current, ...change };
      if (!categoryTouched.current) next.category = suggestCategory(next.date, next.format);
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (savingRef.current || loading || loadError) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
    const payload = {
      date: form.date, time: form.time, format: Number(form.format),
      category: form.category,
      confirmLocation,
      courtId: !addingVenue && form.courtId ? Number(form.courtId) : null,
      aGoalId: !addingVenue && form.aGoalId ? Number(form.aGoalId) : null,
      venueId: !addingVenue && form.venueId ? Number(form.venueId) : null,
      newVenueName: addingVenue ? newVenueName : null,
      priceCents: form.price ? Math.round(Number(form.price) * 100) : null,
      weather: form.weather || null, temperature: form.temperature ? Number(form.temperature) : null,
      notes: form.notes || null, mvpId: form.mvpId ? Number(form.mvpId) : null,
      teams: [
        { side: "A", color: form.aColor, result: form.result === "DRAW" ? "DRAW" : form.result === "A" ? "WIN" : "LOSS", playerIds: form.aPlayers },
        { side: "B", color: form.bColor, result: form.result === "DRAW" ? "DRAW" : form.result === "B" ? "WIN" : "LOSS", playerIds: form.bPlayers },
      ],
    };
    const validated = matchInputSchema.parse(payload);
    validateMatchInput(validated);
    const response = await fetch(match ? `/api/partidos/${match.id}` : "/api/partidos", { method: match ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validated) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "No se pudo guardar el partido.");
    onClose();
    router.refresh();
    } catch (failure) {
      setError(failure instanceof TypeError ? "No se pudo conectar. Revisá tu conexión y volvé a guardar." : failure instanceof ZodError ? failure.issues[0]?.message ?? "Revisá los datos del partido." : failure instanceof Error ? failure.message : "No se pudo guardar el partido. Intentá nuevamente.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget && !savingRef.current) onClose(); }}><section ref={dialogRef} tabIndex={-1} className="modal modal-wide card" role="dialog" aria-modal="true" aria-busy={saving} aria-label={match ? "Modificar partido" : "Crear partido"}><div className="row spread"><h2>{match ? `Modificar partido #${match.id}` : "Crear partido"}</h2><button type="button" className="button" disabled={saving} onClick={() => { if (!savingRef.current) onClose(); }}>Cerrar</button></div>{loading && <p role="status">Cargando jugadores y canchas...</p>}{loadError && <div role="alert"><p className="error">{loadError}</p><button type="button" className="button" onClick={() => setLoadAttempt(value => value + 1)}>Reintentar</button></div>}<form className="stack" onSubmit={submit}><fieldset disabled={saving || loading || Boolean(loadError)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className="stack"><div className="form-grid"><label className="field">Fecha<input type="date" value={form.date} onChange={(event) => updateSchedule({ date: event.target.value })} required /></label><label className="field">Hora<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required /></label><label className="field">Formato<input type="number" min="1" value={form.format} onChange={(event) => updateSchedule({ format: Number(event.target.value) })} required /></label><label className="field">Predio<select value={addingVenue ? "new" : form.venueId} onChange={(event) => { const value = event.target.value; setAddingVenue(value === "new"); setForm({ ...form, venueId: value === "new" ? "" : value, courtId: "", aGoalId: "" }); if (value !== "new") setNewVenueName(""); }}><option value="">Sin predio</option>{venues.map((venue) => <option value={venue.id} key={venue.id}>{venue.name}</option>)}<option value="new">+ Agregar nuevo predio...</option></select>{addingVenue && <input value={newVenueName} onChange={(event) => setNewVenueName(event.target.value)} placeholder="Nombre del nuevo predio" maxLength={100} required autoFocus />}</label><label className="field">Tipo<select value={form.category ?? ""} onChange={event => { categoryTouched.current = true; setForm({ ...form, category: event.target.value as Category }); }}>{matchCategories.map(category => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label><label className="field">Cancha física<select disabled={addingVenue || !form.venueId} value={form.courtId ?? ""} onChange={event => setForm({ ...form, courtId: event.target.value, aGoalId: "" })}><option value="">Sin especificar</option>{availableCourts.map(court => <option key={court.id} value={court.id}>{court.name}</option>)}</select></label><label className="field">Arco de {form.aColor}<select disabled={!selectedCourt || selectedCourt.goals.length !== 2} value={form.aGoalId ?? ""} onChange={event => setForm({ ...form, aGoalId: event.target.value })}><option value="">Sin especificar</option>{selectedCourt?.goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select>{form.aGoalId && opposingGoal && <small>{form.bColor}: {opposingGoal.name}</small>}</label><label className="field">Precio en pesos<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label className="field">Clima<input value={form.weather} onChange={(event) => setForm({ ...form, weather: event.target.value })} /></label><label className="field">Temperatura<input type="number" value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} /></label></div>{match?.locationIsDemo && <label className="same-team-control"><input type="checkbox" checked={confirmLocation} onChange={event => setConfirmLocation(event.target.checked)} /><span>Confirmo que esta cancha y estos arcos son los reales</span></label>}<label className="field">Resultado<select value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value as "A" | "B" | "DRAW" })}><option value="A">Gana equipo A</option><option value="B">Gana equipo B</option><option value="DRAW">Empate</option></select></label><TeamSelector label="Equipo A" color={form.aColor} setColor={(aColor) => setForm({ ...form, aColor })} selected={form.aPlayers} blocked={form.bPlayers} players={players} repeatedGivenNames={repeatedGivenNames} toggle={(id) => toggle("aPlayers", id)} move={(id) => toggle("bPlayers", id, true)} otherLabel="Equipo B" /><TeamSelector label="Equipo B" color={form.bColor} setColor={(bColor) => setForm({ ...form, bColor })} selected={form.bPlayers} blocked={form.aPlayers} players={players} repeatedGivenNames={repeatedGivenNames} toggle={(id) => toggle("bPlayers", id)} move={(id) => toggle("aPlayers", id, true)} otherLabel="Equipo A" /><label className="field">MVP<select value={form.mvpId} onChange={(event) => setForm({ ...form, mvpId: event.target.value })}><option value="">Sin MVP</option>{players.filter((player) => [...form.aPlayers, ...form.bPlayers].includes(player.id)).map((player) => <option value={player.id} key={player.id}>{lineupPlayerName(player, repeatedGivenNames)}</option>)}</select></label><label className="field">Notas<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button primary" disabled={saving || loading || Boolean(loadError)}>{saving ? "Guardando..." : "Guardar partido"}</button></fieldset></form></section></div>;
}

function TeamSelector({ label, color, setColor, selected, blocked, players, repeatedGivenNames, toggle, move, otherLabel }: { label: string; color: string; setColor: (value: string) => void; selected: number[]; blocked: number[]; players: PlayerOption[]; repeatedGivenNames: Set<string>; toggle: (id: number) => void; move: (id: number) => void; otherLabel: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => players.filter(player => !blocked.includes(player.id) && matchesPlayerSearch(player, query)), [blocked, players, query]);
  return <section className="card stack">
    <div className="row spread"><strong>{label} ({selected.length})</strong><input value={color} onChange={event => setColor(event.target.value)} aria-label={`Nombre ${label}`} /></div>
    <div className="selected-list">{selected.map(id => {
      const player = players.find(item => item.id === id);
      const name = player ? lineupPlayerName(player, repeatedGivenNames) : `Jugador #${id}`;
      return <div key={id} className="stack" style={{ gap: 4 }}><button type="button" className="pill selected-player" onClick={() => toggle(id)} aria-label={`Quitar a ${name} de ${label}`}>{name}{player && !player.isActive ? " (inactivo)" : ""} ×</button><button type="button" className="button" onClick={() => move(id)} aria-label={`Mover a ${name} a ${otherLabel}`}>Mover a {otherLabel}</button></div>;
    })}</div>
    <label className="search-field">🔍<input value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} placeholder={`Buscar y agregar a ${label}`} aria-label={`Buscar jugadores para ${label}`} /></label>
    {open && <div className="player-options">{!filtered.length && <p>No hay jugadores para esta búsqueda.</p>}{filtered.map(player => <button type="button" key={player.id} className={`player-option ${selected.includes(player.id) ? "selected-option" : ""}`} onClick={() => toggle(player.id)}><span>{lineupPlayerName(player, repeatedGivenNames)}{!player.isActive && <small> · Inactivo</small>}</span><small>{player._count.participations} PJ</small></button>)}</div>}
  </section>;
}
