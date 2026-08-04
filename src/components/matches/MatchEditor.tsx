"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";

type PlayerOption = {
  id: number;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  legacyFullName: string | null;
  _count: { participations: number };
};

export type EditableMatch = {
  id: number;
  date: string;
  time: string;
  format: number;
  venue: string;
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

const emptyMatch = (): Omit<EditableMatch, "id"> => ({ date: "", time: "21:00", format: 7, venue: "", price: "", weather: "", temperature: "", notes: "", mvpId: "", aColor: "Oscuro", bColor: "Claro", result: "A", aPlayers: [], bPlayers: [] });

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export default function MatchEditor({ match, onClose }: { match?: EditableMatch; onClose: () => void }) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [form, setForm] = useState(match ?? emptyMatch());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const repeatedGivenNames = useMemo(() => {
    const counts = players.reduce((result, player) => result.set(playerGivenNameKey(player), (result.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [players]);
  useEffect(() => { fetch("/api/jugadores?sort=popular&activeOnly=1").then((response) => response.json()).then(setPlayers); }, []);

  function toggle(side: "aPlayers" | "bPlayers", playerId: number) {
    const other = side === "aPlayers" ? "bPlayers" : "aPlayers";
    if (form[other].includes(playerId)) return;
    setForm({ ...form, [side]: form[side].includes(playerId) ? form[side].filter((id) => id !== playerId) : [...form[side], playerId] });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      date: form.date, time: form.time, format: Number(form.format), venue: form.venue || null,
      priceCents: form.price ? Math.round(Number(form.price) * 100) : null,
      weather: form.weather || null, temperature: form.temperature ? Number(form.temperature) : null,
      notes: form.notes || null, mvpId: form.mvpId ? Number(form.mvpId) : null,
      teams: [
        { side: "A", color: form.aColor, result: form.result === "DRAW" ? "DRAW" : form.result === "A" ? "WIN" : "LOSS", playerIds: form.aPlayers },
        { side: "B", color: form.bColor, result: form.result === "DRAW" ? "DRAW" : form.result === "B" ? "WIN" : "LOSS", playerIds: form.bPlayers },
      ],
    };
    const response = await fetch(match ? `/api/partidos/${match.id}` : "/api/partidos", { method: match ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setError(data.error ?? "No se pudo guardar el partido");
    onClose();
    router.refresh();
  }

  return <div className="modal-backdrop"><section className="modal modal-wide card" role="dialog" aria-modal="true" aria-label={match ? "Modificar partido" : "Crear partido"}><div className="row spread"><h2>{match ? `Modificar partido #${match.id}` : "Crear partido"}</h2><button type="button" className="button" onClick={onClose}>Cerrar</button></div><form className="stack" onSubmit={submit}><div className="form-grid"><label className="field">Fecha<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label className="field">Hora<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required /></label><label className="field">Formato<input type="number" min="1" value={form.format} onChange={(event) => setForm({ ...form, format: Number(event.target.value) })} required /></label><label className="field">Cancha<input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} /></label><label className="field">Precio en pesos<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label className="field">Temperatura<input type="number" value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} /></label></div><label className="field">Resultado<select value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value as "A" | "B" | "DRAW" })}><option value="A">Gana equipo A</option><option value="B">Gana equipo B</option><option value="DRAW">Empate</option></select></label><TeamSelector label="Equipo A" color={form.aColor} setColor={(aColor) => setForm({ ...form, aColor })} selected={form.aPlayers} blocked={form.bPlayers} players={players} repeatedGivenNames={repeatedGivenNames} toggle={(id) => toggle("aPlayers", id)} /><TeamSelector label="Equipo B" color={form.bColor} setColor={(bColor) => setForm({ ...form, bColor })} selected={form.bPlayers} blocked={form.aPlayers} players={players} repeatedGivenNames={repeatedGivenNames} toggle={(id) => toggle("bPlayers", id)} /><label className="field">MVP<select value={form.mvpId} onChange={(event) => setForm({ ...form, mvpId: event.target.value })}><option value="">Sin MVP</option>{players.filter((player) => [...form.aPlayers, ...form.bPlayers].includes(player.id)).map((player) => <option value={player.id} key={player.id}>{lineupPlayerName(player, repeatedGivenNames)}</option>)}</select></label><label className="field">Notas<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="error">{error}</p>}<button className="button primary" disabled={saving}>{saving ? "Guardando..." : "Guardar partido"}</button></form></section></div>;
}

function TeamSelector({ label, color, setColor, selected, blocked, players, repeatedGivenNames, toggle }: { label: string; color: string; setColor: (value: string) => void; selected: number[]; blocked: number[]; players: PlayerOption[]; repeatedGivenNames: Set<string>; toggle: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const search = normalize(query);
    return players.filter((player) => !blocked.includes(player.id) && (!search || normalize([player.firstName, player.lastName, player.nickname, player.legacyFullName].filter(Boolean).join(" ")).includes(search)));
  }, [blocked, players, query]);
  return <section className="card stack"><div className="row spread"><strong>{label} ({selected.length})</strong><input value={color} onChange={(event) => setColor(event.target.value)} aria-label={`Nombre ${label}`} /></div><div className="selected-list">{selected.map((id) => { const player = players.find((item) => item.id === id); return player ? <button type="button" className="pill selected-player" key={id} onClick={() => toggle(id)}>{lineupPlayerName(player, repeatedGivenNames)} ×</button> : null; })}</div><label className="search-field">🔍<input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder={`Buscar y agregar a ${label}`} aria-label={`Buscar jugadores para ${label}`} /></label>{open && <div className="player-options">{filtered.map((player) => <button type="button" key={player.id} className={`player-option ${selected.includes(player.id) ? "selected-option" : ""}`} onClick={() => toggle(player.id)}><span>{lineupPlayerName(player, repeatedGivenNames)}</span><small>{player._count.participations} PJ</small></button>)}</div>}</section>;
}
