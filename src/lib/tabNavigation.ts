export const primaryTabs = [
  { href: "/", label: "Home" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/partidos", label: "Partidos" },
  { href: "/foro", label: "Foros" },
  { href: "/estadisticas", label: "Estadísticas" },
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
