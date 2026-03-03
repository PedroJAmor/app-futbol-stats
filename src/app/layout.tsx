// src/app/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Fútbol Amigos",
  description: "Estadísticas y partidos",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es">
      <body>
        <SessionProvider session={session}>
          <Navbar />
          <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
