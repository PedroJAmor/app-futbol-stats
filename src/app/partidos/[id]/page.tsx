import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArgentinaDateTime } from "@/lib/dates";
import { formatPlayerName, lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
import { toArgentinaFormValues } from "@/lib/dates";
import MatchAdminActions from "@/components/matches/MatchAdminActions";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: { id: string } }) {
  const match = await prisma.match.findFirst({ where: { id: Number(params.id), isHidden: false }, include: { mvp: true, teams: { orderBy: { side: "asc" }, include: { participations: { include: { player: true } } } } } });
  if (!match) notFound();
  const [previousMatch, nextMatch, allPlayers] = await Promise.all([
    prisma.match.findFirst({ where: { isHidden: false, playedAt: { lt: match.playedAt } }, orderBy: { playedAt: "desc" }, select: { id: true } }),
    prisma.match.findFirst({ where: { isHidden: false, playedAt: { gt: match.playedAt } }, orderBy: { playedAt: "asc" }, select: { id: true } }),
    prisma.player.findMany({ where: { isHidden: false }, select: { firstName: true, lastName: true, nickname: true, legacyFullName: true } }),
  ]);
  const givenNameCounts = allPlayers.reduce((counts, player) => counts.set(playerGivenNameKey(player), (counts.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
  const repeatedGivenNames = new Set([...givenNameCounts].filter(([, count]) => count > 1).map(([name]) => name));
  const local = toArgentinaFormValues(match.playedAt);
  const editable = { id: match.id, date: local.date, time: local.time, format: match.format, venue: match.venue ?? "", price: match.priceCents == null ? "" : String(match.priceCents / 100), weather: match.weather ?? "", temperature: match.temperature == null ? "" : String(match.temperature), notes: match.notes ?? "", mvpId: match.mvpId ? String(match.mvpId) : "", aColor: match.teams[0]?.color ?? "A", bColor: match.teams[1]?.color ?? "B", result: match.teams.every((team) => team.result === "DRAW") ? "DRAW" as const : match.teams[0]?.result === "WIN" ? "A" as const : "B" as const, aPlayers: match.teams[0]?.participations.map(({ player }) => player.id) ?? [], bPlayers: match.teams[1]?.participations.map(({ player }) => player.id) ?? [] };
  const winner = match.teams.find((team) => team.result === "WIN");
  return <div className="page match-detail-page">
    <div className="detail-toolbar"><Link className="back-link" href="/partidos">← Partidos</Link><MatchAdminActions match={editable} /></div>
    <section className="match-detail-heading"><div><span className="eyebrow">Detalle partido</span><h1>{match.teams[0]?.color} vs {match.teams[1]?.color}</h1><p className="muted">{formatArgentinaDateTime(match.playedAt)} · F{match.format}</p></div><span className="pill">{winner ? `Ganó ${winner.color}` : "Empate"}</span></section>
    <section><h2>Datos</h2><div className="match-facts">{match.venue && <span>Sede: {match.venue}</span>}{match.priceCents != null && <span>Valor: ${(match.priceCents / 100).toLocaleString("es-AR")}</span>}{match.temperature != null && <span>{match.temperature.toString()} °C</span>}{match.weather && <span>{match.weather}</span>}{match.mvp && <span>MVP: {formatPlayerName(match.mvp)}</span>}</div></section>
    <div className="match-teams-grid">{match.teams.map((team) => <section className={`team-sheet${team.result === "WIN" ? " winner" : ""}`} key={team.id}><div className="team-sheet-title"><span>{team.color}</span><strong>{team.result === "WIN" ? "Ganador" : team.result === "DRAW" ? "Empate" : "Equipo"}</strong></div><ol>{team.participations.map(({ player }) => <li key={player.id}><Link href={`/jugadores/${player.id}`}>{lineupPlayerName(player, repeatedGivenNames)}</Link></li>)}</ol></section>)}</div>
    {match.notes && <section className="card match-notes"><h3>Notas</h3><p>{match.notes}</p></section>}
    <nav className="match-pagination" aria-label="Navegación entre partidos">{previousMatch ? <Link className="button" href={`/partidos/${previousMatch.id}`}>← Partido anterior</Link> : <span />}{nextMatch && <Link className="button ghost" href={`/partidos/${nextMatch.id}`}>Partido siguiente →</Link>}</nav>
  </div>;
}
