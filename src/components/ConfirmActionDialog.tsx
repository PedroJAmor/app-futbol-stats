"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmActionDialog({ title, description, confirmLabel, busy, error, onConfirm, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const latest = useRef({ busy, onClose });
  latest.current = { busy, onClose };

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      if (!latest.current.busy) latest.current.onClose();
    };
    element.addEventListener("cancel", cancel);
    return () => {
      element.removeEventListener("cancel", cancel);
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialog} className="card modal confirm-action-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
    onClick={event => { if (event.target === event.currentTarget && !busy) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <div className="stack">
      <h2 id={titleId}>{title}</h2>
      <div id={descriptionId}>{description}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row confirm-action-buttons">
        <button className="button" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="button danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? "Guardando…" : confirmLabel}</button>
      </div>
    </div>
  </dialog>;
}
