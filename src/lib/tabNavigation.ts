export const primaryTabs = [
  { href: "/", label: "Inicio" },
  { href: "/partidos", label: "Partidos" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/foro", label: "Foro" },
] as const;

export function getPrimaryTabIndex(pathname: string) {
  return primaryTabs.findIndex(({ href }) => href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`));
}

export function getSwipeDestination(pathname: string, deltaX: number, deltaY: number) {
  const horizontalDistance = Math.abs(deltaX);
  if (horizontalDistance < 64 || horizontalDistance < Math.abs(deltaY) * 1.25) return null;

  const currentIndex = getPrimaryTabIndex(pathname);
  if (currentIndex < 0) return null;
  const destinationIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
  return primaryTabs[destinationIndex]?.href ?? null;
}
