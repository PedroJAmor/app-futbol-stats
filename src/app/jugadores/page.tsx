import Link from "next/link";
import { statParticipationSelect } from "@/features/stats/select";
import { prisma } from "@/lib/prisma";
import { calculateStats } from "@/lib/stats";
import PlayersDirectory from "@/components/players/PlayersDirectory";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const [players, rows] = await Promise.all([
    prisma.player.findMany({ where: { isHidden: false }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.matchParticipation.findMany({ where: { match: { isHidden: false } }, select: statParticipationSelect }),
  ]);
  const stats = new Map(calculateStats(rows).map((stat) => [stat.playerId, stat]));
  const directoryPlayers = players.map((player) => ({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    nickname: player.nickname,
    isActive: player.isActive,
    legacyFullName: player.legacyFullName,
    photoUrl: player.photoUrl,
    birthDate: player.birthDate?.toISOString() ?? null,
    pj: stats.get(player.id)?.pj ?? 0,
    pts: stats.get(player.id)?.pts ?? 0,
    pctV: stats.get(player.id)?.pctV ?? 0,
  })).sort((a, b) => b.pj - a.pj || a.firstName.localeCompare(b.firstName, "es"));
  return <div className="page"><Link className="button monthly-entry" href="/jugadores/equipos-del-mes">Ver equipos del mes</Link><PlayersDirectory players={directoryPlayers} /></div>;
}
