"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["/", "Home"],
  ["/jugadores", "Jugadores"],
  ["/partidos", "Partidos"],
  ["/foro", "Foros"],
  ["/estadisticas", "Estadísticas"],
];

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="tab-bar" aria-label="Navegación principal">
      {tabs.map(([href, label]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} className={`tab-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
