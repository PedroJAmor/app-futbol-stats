"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AccountDrawer() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session && session.user.role !== "USER";
  return (
    <>
      <button className="account-trigger" onClick={() => setOpen(true)} aria-label="Abrir menú de cuenta">☰</button>
      {open && <button className="drawer-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
      <aside className={`account-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="row" style={{ justifyContent: "space-between" }}><strong>Cuenta</strong><button className="button" onClick={() => setOpen(false)}>Cerrar</button></div>
        <div className="stack" style={{ marginTop: 22 }}>
          <Link href="/perfil" onClick={() => setOpen(false)}>Perfil</Link>
          {isAdmin && <Link href="/admin" onClick={() => setOpen(false)}>Portal de administrador</Link>}
          {session && <button className="button" onClick={() => signOut({ callbackUrl: "/" })}>Cerrar sesión</button>}
        </div>
      </aside>
    </>
  );
}
