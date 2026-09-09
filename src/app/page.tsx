import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import PlayerForm from "@/components/PlayerForm";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateStats, statsForHome } from "@/lib/stats";
import { formatPlayerName } from "@/lib/displayName";
import { formatArgentinaDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const hasLinkedPlayer = Boolean(user?.playerId);
  const [latestMatches, rawStats, myParticipations] = await Promise.all([
    prisma.match.findMany({ where: { isHidden: false }, take: 3, orderBy: { playedAt: "desc" }, include: { teams: { orderBy: { side: "asc" } }, mvp: true, venue: true } }),
    prisma.matchParticipation.findMany({ where: { match: { isHidden: false } }, include: { player: true, team: { include: { match: true } } } }),
    user?.playerId ? prisma.matchParticipation.findMany({ where: { playerId: user.playerId, match: { isHidden: false } }, take: 5, orderBy: { match: { playedAt: "desc" } }, include: { team: true, match: true } }) : [],
  ]);
  const ranking = statsForHome(calculateStats(rawStats));
  return (
    <div className={`page home-page${hasLinkedPlayer ? "" : user ? " home-page-unlinked" : " home-page-unlinked home-page-guest"}`}>
      {user?.playerId && <section className="page-intro"><p className="eyebrow">Fútbol Amigos</p><h1>¡Hola, {user.name?.split(" ")[0]}!</h1><p className="muted">Partidos y estadísticas del grupo.</p><Link className="my-player-link" href={`/jugadores/${user.playerId}`}>Ver mi ficha →</Link></section>}
      {hasLinkedPlayer ? <section className="stack home-personal">
        <h2>Tus últimos 5 partidos</h2>
        {myParticipations.length ? <div className="card"><PlayerForm items={myParticipations.map((item) => ({ id: item.id, result: item.team.result, href: `/partidos/${item.matchId}`, title: `${formatArgentinaDate(item.match.playedAt)} · ${item.team.color}` }))} /></div> : <div className="card">Todavía no tenés partidos registrados.</div>}
      </section> : user ? <section className="card stack home-link-account">
        <div><h2>Vinculá tu cuenta</h2><p>Asociá tu cuenta con tu jugador para ver tus partidos y acceder rápido a tu ficha.</p></div>
        <Link className="button primary" href="/perfil">Vincular mi cuenta</Link>
      </section> : null}
      <section className="stack home-latest"><h2>Últimos partidos</h2>{latestMatches.map((match) => <MatchCard key={match.id} match={{ ...match, venue: match.venue?.name ?? null }} />)}</section>
      <section><h2>Porcentaje de victorias</h2><p className="section-note">Participan quienes jugaron al menos un quinto de los PJ del jugador con más presencias.</p><div className="table-scroll ranking-table"><table><thead><tr><th>Pos.</th><th>Jugador</th><th>PJ</th><th>V</th><th>%V</th></tr></thead><tbody>{ranking.map((stat, index) => <tr key={stat.playerId}><td>{index + 1}</td><td>{formatPlayerName(stat)}</td><td>{stat.pj}</td><td>{stat.v}</td><td>{stat.pctV}%</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
