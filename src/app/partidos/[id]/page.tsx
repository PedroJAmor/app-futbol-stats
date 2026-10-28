import { categoryLabels } from "@/features/matches/categories";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArgentinaMatchDate } from "@/lib/dates";
import { formatPlayerName, lineupPlayerName, playerGivenNameKey } from "@/lib/displayName";
import { toArgentinaFormValues } from "@/lib/dates";
import MatchAdminActions from "@/components/matches/MatchAdminActions";
import PlayerLink from "@/components/players/PlayerLink";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) notFound();
  const match = await prisma.match.findFirst({ where: { id, isHidden: false }, include: { mvp: true, venue: true, court: { include: { goals: true } }, teams: { orderBy: { side: "asc" }, include: { participations: { include: { player: true } }, defendedGoal: true } } } });
  if (!match) notFound();
  const [previousMatch, nextMatch, allPlayers] = await Promise.all([
    prisma.match.findFirst({ where: { isHidden: false, playedAt: { lt: match.playedAt } }, orderBy: { playedAt: "desc" }, select: { id: true } }),
    prisma.match.findFirst({ where: { isHidden: false, playedAt: { gt: match.playedAt } }, orderBy: { playedAt: "asc" }, select: { id: true } }),
    prisma.player.findMany({ where: { isHidden: false }, select: { firstName: true, lastName: true, nickname: true, legacyFullName: true } }),
  ]);
  const givenNameCounts = allPlayers.reduce((counts, player) => counts.set(playerGivenNameKey(player), (counts.get(playerGivenNameKey(player)) ?? 0) + 1), new Map<string, number>());
  const repeatedGivenNames = new Set([...givenNameCounts].filter(([, count]) => count > 1).map(([name]) => name));
  const local = toArgentinaFormValues(match.playedAt);
  const editable = { id: match.id, date: local.date, time: local.time, format: match.format, category: match.category, courtId: match.courtId ? String(match.courtId) : "", aGoalId: match.teams[0]?.defendedGoalId ? String(match.teams[0].defendedGoalId) : "", locationIsDemo: match.locationIsDemo, venueId: match.venueId ? String(match.venueId) : "", price: match.priceCents == null ? "" : String(match.priceCents / 100), weather: match.weather ?? "", temperature: match.temperature == null ? "" : String(match.temperature), notes: match.notes ?? "", mvpId: match.mvpId ? String(match.mvpId) : "", aColor: match.teams[0]?.color ?? "A", bColor: match.teams[1]?.color ?? "B", result: match.teams.every((team) => team.result === "DRAW") ? "DRAW" as const : match.teams[0]?.result === "WIN" ? "A" as const : "B" as const, aPlayers: match.teams[0]?.participations.map(({ player }) => player.id) ?? [], bPlayers: match.teams[1]?.participations.map(({ player }) => player.id) ?? [] };
  const participantCount = match.teams.reduce((total, team) => total + team.participations.length, 0);
  const winner = match.teams.find((team) => team.result === "WIN");
  return <div className="page match-detail-page">
    <div className="detail-toolbar"><MatchAdminActions match={editable} /></div>
    <section className="match-detail-heading">
      <p className="match-team-summary">{match.teams[0]?.color} vs {match.teams[1]?.color} · F{match.format}</p>
      <div className="card match-summary-card">
        <div className="match-card-top"><h2 className="match-date-title"><time dateTime={match.playedAt.toISOString()}>{formatArgentinaMatchDate(match.playedAt)}</time></h2></div>
        <div className="match-card-footer"><span className="match-summary-result">{winner ? `Ganó ${winner.color}` : "Empate"}</span></div>
      </div>
    </section>
    <section><h2>Datos</h2><div className="match-facts">{match.venue && <span><Link href={match.courtId ? `/canchas/${match.venue.id}/pistas/${match.courtId}` : `/canchas/${match.venue.id}`}>Predio: {match.venue.name}{match.court && ` · ${match.court.name}`}</Link></span>}{match.category && <span>{categoryLabels[match.category]}</span>}{match.priceCents != null && <span>Precio (por persona): ${(match.priceCents / 100).toLocaleString("es-AR")}{participantCount > 0 && ` ($${(match.priceCents / 100 / participantCount).toLocaleString("es-AR", { maximumFractionDigits: 2 })})`}</span>}{match.temperature != null && <span>Temperatura: {match.temperature.toString()} °C</span>}{match.weather && <span>Clima: {match.weather.charAt(0).toLocaleUpperCase("es-AR") + match.weather.slice(1)}</span>}{match.mvp && <span className="player-link-container">MVP: <PlayerLink playerId={match.mvp.id}>{formatPlayerName(match.mvp)}</PlayerLink></span>}</div></section>
    <div className="match-teams-grid">{match.teams.map((team) => <section className={`team-sheet${team.result === "WIN" ? " winner" : ""}`} key={team.id}><div className="team-sheet-title"><span>{team.color}</span><strong>{team.result === "WIN" ? "Ganador" : team.result === "DRAW" ? "Empate" : "Equipo"}</strong></div>{team.defendedGoal && <p className="muted" style={{ margin: "8px 0" }}>Arco: {team.defendedGoal.name}</p>}<ol>{team.participations.map(({ player }) => <li key={player.id} className="player-link-container"><PlayerLink playerId={player.id}>{lineupPlayerName(player, repeatedGivenNames)}{match.mvpId === player.id && <span className="mvp-marker" role="img" aria-label="MVP del partido" title="MVP del partido">★</span>}</PlayerLink></li>)}</ol></section>)}</div>
    {match.notes && <section className="card match-notes"><h3>Notas</h3><p>{match.notes}</p></section>}
    <nav className="match-pagination" aria-label="Navegación entre partidos">{previousMatch ? <Link className="button" href={`/partidos/${previousMatch.id}`}>← Partido anterior</Link> : <span />}{nextMatch && <Link className="button ghost" href={`/partidos/${nextMatch.id}`}>Partido siguiente →</Link>}</nav>
  </div>;
}
