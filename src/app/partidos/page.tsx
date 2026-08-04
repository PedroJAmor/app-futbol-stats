import { prisma } from "@/lib/prisma";
import MatchesDirectory from "@/components/matches/MatchesDirectory";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({ where: { isHidden: false }, orderBy: { playedAt: "desc" }, include: { teams: { orderBy: { side: "asc" } }, mvp: true } });
  const publicMatches = matches.map((match) => ({
    id: match.id,
    playedAt: match.playedAt.toISOString(),
    format: match.format,
    venue: match.venue,
    teams: match.teams.map((team) => ({ color: team.color, result: team.result })),
  }));
  return <div className="page"><MatchesDirectory matches={publicMatches} /></div>;
}
