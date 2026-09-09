"use client";

import { useEffect, useRef, type TouchEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSwipeDestination, getPrimaryTabIndex } from "@/lib/tabNavigation";

type TouchStart = { x: number; y: number };

function shouldIgnoreSwipe(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;
  return Boolean(target.closest("input, textarea, select, button, [role='dialog'], [data-swipe-ignore='true'], .modal-backdrop, .table-scroll, .player-options, .comparison-sheet"));
}

export default function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const start = useRef<TouchStart | null>(null);
  const suppressClick = useRef(false);
  const enabled = getPrimaryTabIndex(pathname) >= 0;

  useEffect(() => {
    start.current = null;
  }, [pathname]);

  function resetGesture() {
    start.current = null;
  }

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (!enabled || event.touches.length !== 1 || shouldIgnoreSwipe(event.target)) return;
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchMove(event: TouchEvent<HTMLElement>) {
    if (!start.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - start.current.x;
    const deltaY = touch.clientY - start.current.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) return resetGesture();
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (!start.current) return resetGesture();
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.current.x;
    const deltaY = touch.clientY - start.current.y;
    const destination = getSwipeDestination(pathname, deltaX, deltaY);
    if (destination) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 350);
      router.push(destination);
    }
    resetGesture();
  }

  return <main
    className="app-main swipe-surface"
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
    onTouchCancel={resetGesture}
    onClickCapture={(event) => {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
    }}
  >{children}</main>;
}
