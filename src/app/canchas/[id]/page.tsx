import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MatchCard from "@/components/MatchCard";
import VenueAdminActions from "@/components/venues/VenueAdminActions";
import { venueSelect } from "@/features/venues/service";
import { matchCardSelect, toMatchCard } from "@/features/matches/cards";
import GoalStats from "@/components/stats/GoalStats";
import "@/components/venues/venues.css";
export const dynamic = "force-dynamic";
export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId); if (!/^\d+$/.test(rawId) || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) notFound();
  const [venue, matches] = await Promise.all([
    prisma.venue.findUnique({ where: { id }, select: venueSelect }),
    prisma.match.findMany({ where: { venueId: id, isHidden: false }, orderBy: { playedAt: "desc" }, select: { ...matchCardSelect, court: { select: { id: true, name: true } } } }),
  ]);
  if (!venue) notFound();
  const mapUrl = venue.mapUrl || (venue.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}` : null);
  return <div className="page venues-page"><Link href="/canchas">← Predios y canchas</Link><div className="venue-heading"><h2>{venue.name}</h2><VenueAdminActions venue={venue} /></div>{venue.photoUrl && <img className="venue-hero-photo" src={venue.photoUrl} alt={`Predio ${venue.name}`} />}<div className="venue-meta">{venue.address ? <span>{venue.address}</span> : <span className="muted">Dirección sin completar</span>}{mapUrl && <a className="button" href={mapUrl} target="_blank" rel="noopener noreferrer">Ver mapa ↗</a>}</div>
    <section className="stack"><div className="venue-heading"><h2>Canchas</h2><VenueAdminActions venue={venue} createCourt /></div><div className="venue-grid">{venue.courts.map(court => <Link className="card venue-card" key={court.id} href={`/canchas/${id}/pistas/${court.id}`}>{court.photoUrl && <img loading="lazy" src={court.photoUrl} alt={court.name} />}<h3>{court.name}</h3></Link>)}</div>{!venue.courts.length && <p className="muted">Todavía no se especificaron las canchas de este predio.</p>}</section>
    <GoalStats venueId={id} />
    <section className="stack"><div className="section-heading"><h2>Partidos jugados</h2><Link href={`/partidos?venueId=${id}`}>Ver en Partidos</Link></div><p className="muted">{matches.length} partidos · {matches.filter(match => !match.court).length} sin cancha especificada</p><div className="venue-history">{matches.map(match => <div key={match.id}><p className="venue-history-note">{match.court?.name ?? "Cancha sin especificar"}</p><MatchCard match={toMatchCard(match)} showResult /></div>)}</div>{!matches.length && <p className="muted">Todavía no hay partidos registrados en este predio.</p>}</section>
  </div>;
}
