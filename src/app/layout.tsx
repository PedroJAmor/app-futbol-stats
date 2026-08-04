import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = { title: "Fútbol Amigos", description: "Partidos y estadísticas entre amigos" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="es">
      <body>
        <SessionProvider session={session}>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
