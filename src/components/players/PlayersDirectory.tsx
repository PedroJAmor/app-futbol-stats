"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
import PlayerEditor, { type EditablePlayer } from "./PlayerEditor";

type PlayerItem = EditablePlayer & {
  legacyFullName: string | null;
  photoUrl: string | null;
  pj: number;
  pts: number;
  pctV: number;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export default function PlayersDirectory({ players }: { players: PlayerItem[] }) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditablePlayer | "new" | null>(null);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  const repeatedGivenNames = useMemo(() => {
    const counts = players.reduce((result, player) => result.set(playerGivenNameKey(player), (result.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [players]);
  const filtered = useMemo(() => {
    const search = normalize(query);
    if (!search) return players;
    return players.filter((player) => normalize([player.firstName, player.lastName, player.nickname, player.legacyFullName].filter(Boolean).join(" ")).includes(search));
  }, [players, query]);

  return <>
    <section className="directory-heading">
      <p className="directory-count" role="status">{query ? `${filtered.length} de ${players.length} jugadores` : `${players.length} jugadores`}</p>
      {isAdmin && <button className="button primary" onClick={() => setEditor("new")}>+ Crear jugador</button>}
    </section>
    <label className="search-field player-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, apellido o apodo" aria-label="Buscar jugador" /></label>
    <div className="players-grid">
      {filtered.map((player) => <Link className={`player-tile${player.photoUrl ? " has-photo" : ""}`} href={`/jugadores/${player.id}`} key={player.id} style={player.photoUrl ? { backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(0,0,0,.82)), url(${player.photoUrl})` } : undefined}>
        <span className="player-initial" aria-hidden="true">{player.firstName.slice(0, 1)}</span>
        <span className="player-tile-copy"><strong>{lineupPlayerName(player, repeatedGivenNames)}</strong>{!player.isActive && <small>Inactivo</small>}{player.pj > 0 && <small>{player.pj} PJ · {player.pctV}% V</small>}</span>
      </Link>)}
    </div>
    {filtered.length === 0 && <p className="muted empty-state">No encontramos jugadores con esa búsqueda.</p>}
    {editor && <PlayerEditor player={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
  </>;
}
