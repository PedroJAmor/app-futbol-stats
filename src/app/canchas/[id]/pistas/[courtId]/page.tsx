import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MatchCard from "@/components/MatchCard";
import VenueAdminActions from "@/components/venues/VenueAdminActions";
import { courtSelect } from "@/features/venues/service";
import { matchCardSelect, toMatchCard } from "@/features/matches/cards";
import GoalStats from "@/components/stats/GoalStats";
import "@/components/venues/venues.css";
export const dynamic = "force-dynamic";
export default async function CourtPage({ params }: { params: Promise<{ id: string; courtId: string }> }) {
  const raw = await params; const id = Number(raw.id), courtId = Number(raw.courtId);
  if ([raw.id, raw.courtId].some(value => !/^\d+$/.test(value) || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 2_147_483_647)) notFound();
  const court = await prisma.court.findFirst({ where: { id: courtId, venueId: id }, select: { ...courtSelect, venue: { select: { id: true, name: true } } } });
  if (!court) notFound();
  const matches = await prisma.match.findMany({ where: { courtId, venueId: id, isHidden: false }, orderBy: { playedAt: "desc" }, select: matchCardSelect });
  return <div className="page venues-page"><div className="venue-heading"><h2>{court.name}</h2><VenueAdminActions venue={court.venue} court={court} /></div>{court.photoUrl && <img className="venue-hero-photo" src={court.photoUrl} alt={court.name} />}<GoalStats venueId={id} courtId={courtId} /><section className="stack"><div className="section-heading"><h2>Partidos jugados</h2><Link href={`/partidos?venueId=${id}&courtId=${courtId}`}>Ver en Partidos</Link></div><p className="muted">{matches.length} partidos</p><div className="venue-history">{matches.map(match => <MatchCard key={match.id} match={toMatchCard(match)} showResult />)}</div>{!matches.length && <p className="muted">Todavía no hay partidos asignados a esta cancha.</p>}</section></div>;
}
