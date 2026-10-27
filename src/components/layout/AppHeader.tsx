"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPrimaryTabIndex, primaryTabs } from "@/lib/tabNavigation";
import AccountDrawer from "./AccountDrawer";

export default function AppHeader() {
  const pathname = usePathname();
  const tabIndex = getPrimaryTabIndex(pathname);
  const tab = primaryTabs[tabIndex];
  const isDetail = tab && pathname !== tab.href;
  const title = pathname.startsWith("/partidos/") ? "Detalle partido"
    : pathname.startsWith("/jugadores/") ? "Ficha del jugador"
    : tabIndex > 0 ? tab.label : "Fútbol Amigos";
  const backHref = isDetail ? tab.href : "/";

  return <header className="app-header">
    <div className="header-inner">
      {pathname !== "/" ? <Link className="header-back" href={backHref} aria-label={isDetail ? `Volver a ${tab.label}` : "Volver a Inicio"}>
        <img src="/icons/arrow-right.svg" width={21.888} height={21.888} alt="" />
      </Link> : <span className="header-spacer" aria-hidden="true" />}
      {tab ? <h1 className="header-title">{title}</h1> : <Link className="header-title" href="/">{title}</Link>}
      <AccountDrawer />
    </div>
  </header>;
}
