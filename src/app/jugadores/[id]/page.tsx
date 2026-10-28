import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateStats } from "@/lib/stats";
import { formatArgentinaDate } from "@/lib/dates";
import { fullPlayerName } from "@/lib/displayName";
import PlayerAdminActions from "@/components/players/PlayerAdminActions";
import PlayerForm from "@/components/PlayerForm";

export const dynamic = "force-dynamic";

const resultLabel: Record<string, string> = { WIN: "Ganó", DRAW: "Empató", LOSS: "Perdió" };

function playerAge(birthDate: Date | null) {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth() || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) notFound();
  const player = await prisma.player.findFirst({ where: { id, isHidden: false }, include: { participations: { where: { match: { isHidden: false } }, select: { id: true, matchId: true, team: { select: { id: true, color: true, result: true } }, match: { select: { id: true, format: true, playedAt: true, isHidden: true, mvpId: true } } }, orderBy: { match: { playedAt: "desc" } } } } });
  if (!player) notFound();
  const stat = calculateStats(player.participations.map(item => ({
    player,
    team: { ...item.team, match: item.match },
  })))[0];
  const editable = { id: player.id, firstName: player.firstName, lastName: player.lastName, nickname: player.nickname, birthDate: player.birthDate?.toISOString() ?? null, photoUrl: player.photoUrl, isActive: player.isActive };
  const age = playerAge(player.birthDate);
  const recent = player.participations.slice(0, 5);
  return <div className="page player-profile-page">
    <div className="detail-toolbar"><PlayerAdminActions player={editable} /></div>
    <section className={`player-hero${player.photoUrl ? " has-photo" : ""}`} style={player.photoUrl ? { backgroundImage: `linear-gradient(180deg, transparent 25%, rgba(0,0,0,.74)), url(${player.photoUrl})` } : undefined}>
      {!player.photoUrl && <span className="hero-initial" aria-hidden="true">{player.firstName.slice(0, 1)}</span>}
      <div className="player-identity card"><strong>{fullPlayerName(player)}</strong>{player.birthDate && <span className="player-birth-date">{formatArgentinaDate(player.birthDate)}{age !== null ? ` · ${age} años` : ""}</span>}{player.nickname && <span className="player-nickname">{player.nickname}</span>}</div>
    </section>
    {stat && <section className="compact-stats" aria-label="Estadísticas del jugador">
      {[['PJ', stat.pj], ['V', stat.v], ['E', stat.e], ['D', stat.d], ['PTS', stat.pts], ['%V', `${stat.pctV}%`], ['%D', `${stat.pctD}%`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </section>}
    <section><h2>Últimos 5 partidos</h2>{recent.length ? <PlayerForm items={recent.map((item) => ({ id: item.id, result: item.team.result, href: `/partidos/${item.matchId}`, title: `${formatArgentinaDate(item.match.playedAt)} · ${resultLabel[item.team.result]}` }))} /> : <p className="muted">Todavía no tiene partidos cargados.</p>}</section>
    <section><h2>Historial de partidos</h2><div className="table-scroll"><table className="history-table"><thead><tr><th>Fecha</th><th>Formato</th><th>Equipo</th><th>Resultado</th></tr></thead><tbody>{player.participations.map((item) => <tr key={item.id}><td><Link href={`/partidos/${item.matchId}`}>{formatArgentinaDate(item.match.playedAt)}</Link></td><td>F{item.match.format}</td><td>{item.team.color}</td><td><span className={`result-dot result-${item.team.result.toLowerCase()}`} title={resultLabel[item.team.result]} />{item.match.mvpId === player.id && <span className="mvp-marker" role="img" aria-label="MVP del partido" title="MVP del partido">★</span>}</td></tr>)}</tbody></table></div></section>
  </div>;
}
