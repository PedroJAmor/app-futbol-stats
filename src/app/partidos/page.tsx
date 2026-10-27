import { prisma } from "@/lib/prisma";
import { formatPlayerName } from "@/lib/displayName";
import { matchCardSelect, toMatchCard } from "@/features/matches/cards";
import MatchesDirectory from "@/components/matches/MatchesDirectory";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const [matches, formats, venues, players] = await Promise.all([
    prisma.match.findMany({ where: { isHidden: false }, orderBy: { playedAt: "desc" }, select: matchCardSelect }),
    prisma.match.groupBy({ by: ["format"], where: { isHidden: false }, orderBy: { format: "asc" } }),
    prisma.venue.findMany({ where: { matches: { some: { isHidden: false } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.player.findMany({
      where: { isHidden: false, participations: { some: { match: { isHidden: false } } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, nickname: true, legacyFullName: true },
    }),
  ]);
  return <div className="page"><MatchesDirectory
    matches={matches.map(toMatchCard)}
    formats={formats.map(item => item.format)}
    venues={venues}
    players={players.map(player => ({ id: player.id, name: formatPlayerName(player) }))}
  /></div>;
}
