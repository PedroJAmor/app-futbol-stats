"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AccountDrawer() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { data: session, status } = useSession();
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    // A native modal keeps keyboard focus inside and makes the page underneath inert.
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  return <>
    <button ref={trigger} className="account-trigger" type="button" onClick={() => setOpen(true)} aria-label="Abrir menú de cuenta" aria-expanded={open} aria-controls="account-menu" aria-haspopup="dialog">
      <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
    </button>
    <dialog
      ref={dialog}
      id="account-menu"
      className="account-drawer"
      aria-labelledby="account-menu-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
        const first = controls[0];
        const last = controls[controls.length - 1];
        // Wrap at the edges instead of moving focus to the browser chrome.
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}
    >
      <div className="account-drawer-heading">
        <h2 id="account-menu-title">Tu cuenta</h2>
        <button className="account-close" type="button" onClick={close} aria-label="Cerrar menú de cuenta" autoFocus><span aria-hidden="true">×</span></button>
      </div>
      <div className="account-identity">
        <span className="account-avatar" aria-hidden="true">{session?.user.name?.trim().slice(0, 1).toLocaleUpperCase("es") || "FA"}</span>
        <div>
          <strong>{status === "loading" ? "Cargando cuenta…" : session?.user.name || (session ? "Mi cuenta" : "¡Bienvenido!")}</strong>
          <p>{session ? "Tu lugar en Fútbol Amigos" : "Partidos y estadísticas entre amigos"}</p>
        </div>
      </div>
      <nav className="account-links" aria-label="Cuenta">
        <Link href="/perfil" onClick={close}><span>{session ? "Mi perfil" : "Ingresar a mi cuenta"}</span><span aria-hidden="true">→</span></Link>
        {isAdmin && <Link href="/admin" onClick={close}><span>Administración</span><span aria-hidden="true">→</span></Link>}
      </nav>
      <div className="account-drawer-footer">
        {!session && status !== "loading" && <p>Podés explorar la app y participar del foro sin iniciar sesión.</p>}
        {session && <button className="button account-signout" type="button" onClick={() => { close(); void signOut({ callbackUrl: "/" }); }}>Cerrar sesión</button>}
        <span className="account-wordmark">Fútbol Amigos</span>
      </div>
    </dialog>
  </>;
}
