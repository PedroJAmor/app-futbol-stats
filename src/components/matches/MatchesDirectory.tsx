"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import MatchCard from "@/components/MatchCard";
import MatchEditor from "./MatchEditor";

type MatchItem = Parameters<typeof MatchCard>[0]["match"];

export default function MatchesDirectory({ matches }: { matches: MatchItem[] }) {
  const { data: session } = useSession();
  const [creating, setCreating] = useState(false);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  return <><section className="directory-heading"><div><h1>Partidos</h1><p className="muted">{matches.length} partidos jugados</p></div>{isAdmin && <button className="button primary" onClick={() => setCreating(true)}>+ Crear partido</button>}</section><div className="matches-list">{matches.map((match) => <MatchCard match={match} key={match.id} />)}</div>{creating && <MatchEditor onClose={() => setCreating(false)} />}</>;
}
