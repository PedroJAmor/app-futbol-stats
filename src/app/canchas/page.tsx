import Link from "next/link";
import { prisma } from "@/lib/prisma";
import VenueAdminActions from "@/components/venues/VenueAdminActions";
import "@/components/venues/venues.css";
export const dynamic = "force-dynamic";
export default async function VenuesPage() {
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, address: true, photoUrl: true, _count: { select: { courts: true, matches: { where: { isHidden: false } } } } } });
  return <div className="page venues-page"><div className="venue-heading"><div><h2>Predios y canchas</h2><p className="muted">{venues.length} predios</p></div><VenueAdminActions createVenue /></div><div className="venue-grid">{venues.map(venue => <Link className="card venue-card" key={venue.id} href={`/canchas/${venue.id}`}>{venue.photoUrl ? <img loading="lazy" src={venue.photoUrl} alt={venue.name} /> : <div className="venue-placeholder">Sin foto</div>}<h3>{venue.name}</h3>{venue.address && <p>{venue.address}</p>}<p>{venue._count.courts} {venue._count.courts === 1 ? "cancha" : "canchas"} · {venue._count.matches} {venue._count.matches === 1 ? "partido" : "partidos"}</p></Link>)}</div>{!venues.length && <p className="muted">Todavía no hay predios registrados.</p>}</div>;
}
