"use client";

import { useEffect, useLayoutEffect, useRef, type TouchEvent } from "react";
import { getSwipeDestination, getPrimaryTabIndex } from "@/lib/tabNavigation";
import { usePathname, useRouter } from "next/navigation";

type TouchStart = { x: number; y: number; identifier: number; horizontal: boolean };
type PendingNavigation = { destination: string; direction: number };
const SETTLE_MS = 180;
const NAVIGATION_TIMEOUT_MS = 10_000;

function shouldIgnoreSwipe(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;
  return Boolean(target.closest("input, textarea, select, button, summary, [contenteditable='true'], dialog, [role='dialog'], [data-swipe-ignore='true'], .modal-backdrop, .table-scroll, .player-options, .comparison-sheet"));
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export default function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const surface = useRef<HTMLElement>(null);
  const start = useRef<TouchStart | null>(null);
  const pending = useRef<PendingNavigation | null>(null);
  const currentPath = useRef(pathname);
  const suppressClick = useRef(false);
  const animationTimer = useRef<number | null>(null);
  const navigationTimer = useRef<number | null>(null);
  const clickTimer = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const prefetched = useRef(new Set<string>());
  const routerRef = useRef(router);
  routerRef.current = router;

  // Warm only the neighboring route the user is actually dragging toward.
  function prefetchIntent(deltaX: number) {
    const destination = getSwipeDestination(currentPath.current, Math.sign(deltaX) * 64, 0);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!destination || connection?.saveData || prefetched.current.has(destination)) return;
    prefetched.current.add(destination);
    try { routerRef.current.prefetch(destination); } catch { /* Prefetch is optional. */ }
  }

  function clearMotionTimers() {
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    animationTimer.current = navigationTimer.current = frame.current = null;
  }

  function clearVisual() {
    const element = surface.current;
    if (!element) return;
    element.style.removeProperty("transform");
    element.style.removeProperty("transition");
    element.style.removeProperty("will-change");
    element.style.removeProperty("pointer-events");
  }

  function suppressGestureClick() {
    suppressClick.current = true;
    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => { suppressClick.current = false; }, 350);
  }

  function snapBack() {
    if (suppressClick.current) suppressGestureClick();
    start.current = null;
    pending.current = null;
    clearMotionTimers();
    const element = surface.current;
    if (!element) return;
    element.style.removeProperty("pointer-events");
    if (prefersReducedMotion() || !element.style.transform) return clearVisual();
    element.style.transition = `transform ${SETTLE_MS}ms ease-out`;
    element.style.transform = "translate3d(0px, 0, 0)";
    animationTimer.current = window.setTimeout(clearVisual, SETTLE_MS);
  }

  // Position the new route before paint, then slide it in from the adjacent side.
  useLayoutEffect(() => {
    if (currentPath.current === pathname) return;
    currentPath.current = pathname;
    const arriving = pending.current;
    pending.current = null;
    start.current = null;
    clearMotionTimers();
    clearVisual();
    const element = surface.current;
    if (!element || arriving?.destination !== pathname || prefersReducedMotion()) return;
    element.style.willChange = "transform";
    element.style.transform = `translate3d(${-arriving.direction * Math.min(96, window.innerWidth * .25)}px, 0, 0)`;
    element.getBoundingClientRect();
    frame.current = window.requestAnimationFrame(() => {
      element.style.transition = `transform ${SETTLE_MS}ms ease-out`;
      element.style.transform = "translate3d(0px, 0, 0)";
      animationTimer.current = window.setTimeout(clearVisual, SETTLE_MS);
    });
  }, [pathname]);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    function onMove(event: globalThis.TouchEvent) {
      const gesture = start.current;
      if (!gesture) return;
      const touch = event.touches[0];
      if (event.touches.length !== 1 || touch.identifier !== gesture.identifier) return snapBack();
      const deltaX = touch.clientX - gesture.x;
      const deltaY = touch.clientY - gesture.y;
      if (!gesture.horizontal) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) return snapBack();
        if (Math.abs(deltaX) <= 12 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
        gesture.horizontal = true;
        suppressClick.current = true;
      }
      prefetchIntent(deltaX);
      if (event.cancelable) event.preventDefault();
      if (prefersReducedMotion()) return;
      const hasNeighbor = getSwipeDestination(currentPath.current, Math.sign(deltaX) * 64, 0);
      const displacement = hasNeighbor
        ? Math.max(-window.innerWidth, Math.min(window.innerWidth, deltaX))
        : Math.sign(deltaX) * Math.min(72, Math.abs(deltaX) * .22);
      element!.style.willChange = "transform";
      element!.style.transition = "none";
      element!.style.transform = `translate3d(${displacement}px, 0, 0)`;
    }
    element.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      element.removeEventListener("touchmove", onMove);
      clearMotionTimers();
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    };
  }, []);

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (pending.current) return;
    if (suppressClick.current) suppressGestureClick();
    clearMotionTimers();
    clearVisual();
    start.current = null;
    if (getPrimaryTabIndex(pathname) < 0 || event.touches.length !== 1 || shouldIgnoreSwipe(event.target)) return;
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY, identifier: touch.identifier, horizontal: false };
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (!start.current) return;
    const gesture = start.current;
    const touch = event.changedTouches[0];
    if (event.touches.length > 0 || !touch || touch.identifier !== gesture.identifier) {
      suppressGestureClick();
      return snapBack();
    }
    const deltaX = touch.clientX - gesture.x;
    const deltaY = touch.clientY - gesture.y;
    const destination = getSwipeDestination(pathname, deltaX, deltaY);
    start.current = null;
    if (gesture.horizontal || destination) suppressGestureClick();
    if (!destination) return snapBack();
    const direction = Math.sign(deltaX);
    pending.current = { destination, direction };
    // Keep the existing page visible while Next resolves the destination. Starting
    // navigation now avoids adding an exit animation to network/SSR latency.
    const element = surface.current;
    if (element && !prefersReducedMotion()) {
      element.style.transition = `transform ${SETTLE_MS}ms ease-out`;
      element.style.transform = "translate3d(0px, 0, 0)";
      animationTimer.current = window.setTimeout(clearVisual, SETTLE_MS);
    } else {
      clearVisual();
    }
    // A slow route must never leave an empty surface or queue repeated pushes.
    // Retain the intent through normal loading, but allow retry after a bounded
    // timeout if navigation fails asynchronously (for example when offline).
    navigationTimer.current = window.setTimeout(() => {
      pending.current = null;
      start.current = null;
      clearMotionTimers();
      clearVisual();
    }, NAVIGATION_TIMEOUT_MS);
    try { router.push(destination); } catch { snapBack(); }
  }

  return <div className="swipe-viewport"><main
    id="main-content"
    tabIndex={-1}
    ref={surface}
    className="app-main swipe-surface"
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
    onTouchCancel={() => { if (!pending.current) { suppressGestureClick(); snapBack(); } }}
    onClickCapture={(event) => {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
    }}
  >{children}</main></div>;
}
