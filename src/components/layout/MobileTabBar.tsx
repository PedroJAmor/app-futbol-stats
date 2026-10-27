"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPrimaryTabIndex, primaryTabs } from "@/lib/tabNavigation";

export default function MobileTabBar() {
  const pathname = usePathname();
  const currentIndex = getPrimaryTabIndex(pathname);
  const [allowPrefetch, setAllowPrefetch] = useState(false);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setAllowPrefetch(!connection?.saveData);
  }, []);
  return (
    <nav className="tab-bar" aria-label="Navegación principal">
      <div className="tab-bar-inner">
      {primaryTabs.map(({ href, label }, index) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} prefetch={allowPrefetch && currentIndex >= 0 && Math.abs(index - currentIndex) === 1} className={`tab-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
      </div>
    </nav>
  );
}
