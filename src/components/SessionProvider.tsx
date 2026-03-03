"use client";
// src/components/SessionProvider.tsx
// Wrapper necesario porque NextAuth usa contexto de React (client-side)
// El layout es un Server Component, así que el Provider tiene que ser un Client Component aparte

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export default function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
