"use client";
// src/components/Navbar.tsx

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const links = [
    { href: "/",             label: "Inicio" },
    { href: "/partidos",     label: "Partidos" },
    { href: "/jugadores",    label: "Jugadores" },
    { href: "/estadisticas", label: "Estadísticas" },
  ];

  return (
    <nav style={{
      borderBottom: "1px solid #ddd",
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      gap: 4,
      height: 52,
    }}>
      <span style={{ fontWeight: 700, marginRight: 12 }}>⚽</span>

      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: pathname === l.href ? 700 : 400,
            color: pathname === l.href ? "#000" : "#555",
            background: pathname === l.href ? "#f0f0f0" : "transparent",
          }}
        >
          {l.label}
        </Link>
      ))}

      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        {isAdmin && (
          <Link href="/admin" style={{ padding: "6px 12px", borderRadius: 4, textDecoration: "none", fontSize: 14, color: "#555" }}>
            Admin
          </Link>
        )}
        {session ? (
          <button
            onClick={() => signOut()}
            style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
          >
            Salir
          </button>
        ) : (
          <Link href="/admin/login" style={{ padding: "6px 12px", fontSize: 13, color: "#555", textDecoration: "none" }}>
            Ingresar
          </Link>
        )}
      </div>
    </nav>
  );
}
