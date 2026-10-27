import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import PlayerForm from "@/components/PlayerForm";
import { PlayerTableRow } from "@/components/players/PlayerLink";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateStats, statsForHome } from "@/lib/stats";
import { formatPlayerName, lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
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
  const allStats = calculateStats(rawStats);
  const ranking = statsForHome(allStats);
  const givenNameCounts = allStats.reduce((counts, player) => counts.set(playerGivenNameKey(player), (counts.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
  const repeatedGivenNames = new Set([...givenNameCounts].filter(([, count]) => count > 1).map(([name]) => name));
  return (
    <div className={`page home-page${hasLinkedPlayer ? "" : user ? " home-page-unlinked" : " home-page-unlinked home-page-guest"}`}>
      {user?.playerId && <section className="page-intro"><h2 className="home-greeting">¡Hola, {user.name?.split(" ")[0]}!</h2><Link className="my-player-link" href={`/jugadores/${user.playerId}`}>Ver mi ficha →</Link></section>}
      {hasLinkedPlayer ? <section className="card stack home-personal">
        <h2>Tus últimos 5 partidos</h2>
        {myParticipations.length ? <PlayerForm compact items={myParticipations.map((item) => ({ id: item.id, result: item.team.result, href: `/partidos/${item.matchId}`, title: `${formatArgentinaDate(item.match.playedAt)} · ${item.team.color}` }))} /> : <p className="muted">Todavía no tenés partidos registrados.</p>}
      </section> : user ? <section className="card stack home-link-account">
        <div><h2>Vinculá tu cuenta</h2><p>Asociá tu cuenta con tu jugador para ver tus partidos y acceder rápido a tu ficha.</p></div>
        <Link className="button primary" href="/perfil">Vincular mi cuenta</Link>
      </section> : null}
      <section className="stack home-latest"><div className="section-heading"><h2>Últimos partidos</h2><Link href="/partidos">Ver todos</Link></div><div className="home-match-grid">{latestMatches.map((match) => <MatchCard compact key={match.id} match={{ ...match, venue: match.venue?.name ?? null }} />)}</div>{latestMatches.length === 0 && <p className="muted empty-state">Todavía no hay partidos registrados.</p>}</section>
      <section className="home-ranking"><h2>Porcentaje de victorias</h2><div className="table-scroll ranking-table"><table><thead><tr><th>Pos.</th><th>Jugador</th><th>PJ</th><th>V</th><th>%V</th></tr></thead><tbody>{ranking.map((stat, index) => <PlayerTableRow key={stat.playerId} playerId={stat.playerId} name={lineupPlayerName(stat, repeatedGivenNames)} title={formatPlayerName(stat)} leading={index + 1}><td>{stat.pj}</td><td>{stat.v}</td><td>{stat.pctV}%</td></PlayerTableRow>)}</tbody></table></div>{ranking.length === 0 && <p className="muted empty-state">El ranking aparecerá cuando haya partidos registrados.</p>}</section>
    </div>
  );
}
