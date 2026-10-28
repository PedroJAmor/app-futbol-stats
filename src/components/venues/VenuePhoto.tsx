export default function VenuePhoto({ src, alt }: { src: string; alt: string }) {
  return <a className="venue-photo-link" href={src} target="_blank" rel="noopener noreferrer" aria-label={`Ver foto ampliada: ${alt}`}>
    <img className="venue-hero-photo" src={src} alt={alt} />
    <span>Ver foto ampliada ↗</span>
  </a>;
}
