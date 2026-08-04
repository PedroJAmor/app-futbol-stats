"use client";

import { signIn, signOut } from "next-auth/react";

export function LoginButton({ configured }: { configured: boolean }) {
  return configured ? <button className="button primary" onClick={() => signIn("google", { callbackUrl: "/perfil" })}>Ingresar con Google</button> : <p className="muted">Google OAuth todavía no está configurado. Completá las variables de entorno para probar el login.</p>;
}

export function LogoutButton() {
  return <button className="button" onClick={() => signOut({ callbackUrl: "/" })}>Cerrar sesión</button>;
}
