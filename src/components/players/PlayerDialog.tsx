"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function PlayerDialog({ label, busy, onClose, children }: { label: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = ref.current;
    const focusable = () => Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]') ?? []);
    (element?.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0] ?? element)?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  return <div className="modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={ref} className="modal card" role="dialog" aria-modal="true" aria-label={label} aria-busy={busy} tabIndex={-1} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }
      if (event.key === "Tab") {
        const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]') ?? []);
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); ref.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>{children}</section>
  </div>;
}
