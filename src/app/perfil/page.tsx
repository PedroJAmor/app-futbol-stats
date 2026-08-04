import { getCurrentUser } from "@/features/auth/session";
import { isGoogleAuthConfigured } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStats } from "@/lib/stats";
import { formatPlayerName } from "@/lib/displayName";
import { LoginButton, LogoutButton } from "@/components/ProfileActions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="page"><h1>Perfil</h1><section className="card"><p>Ingresá para ver tu cuenta.</p><LoginButton configured={isGoogleAuthConfigured} /></section></div>;
  const player = user.playerId ? await prisma.player.findUnique({ where: { id: user.playerId } }) : null;
  const rows = user.playerId ? await prisma.matchParticipation.findMany({ where: { playerId: user.playerId, match: { isHidden: false } }, include: { player: true, team: { include: { match: true } } } }) : [];
  const stats = calculateStats(rows)[0];
  return <div className="page"><h1>Perfil</h1><section className="card"><h2>{user.name ?? "Usuario"}</h2><p>{user.email}</p><p>Rol: {user.role}</p><LogoutButton /></section>{player ? <section className="card"><h2>{formatPlayerName(player)}</h2>{stats ? <p>PJ {stats.pj} · V {stats.v} · E {stats.e} · D {stats.d} · Pts {stats.pts} · %V {stats.pctV}%</p> : <p>Sin partidos registrados.</p>}</section> : <section className="card">Tu cuenta todavía no está vinculada a un jugador.</section>}</div>;
}
