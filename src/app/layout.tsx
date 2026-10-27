import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = { title: "Fútbol Amigos", description: "Partidos y estadísticas entre amigos" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#e7ff51" };

const poppins = localFont({
  src: [
    { path: "../../public/fonts/poppins-400.ttf", weight: "400" },
    { path: "../../public/fonts/poppins-500.ttf", weight: "500" },
    { path: "../../public/fonts/poppins-600.ttf", weight: "600" },
    { path: "../../public/fonts/poppins-700.ttf", weight: "700" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="es" className={poppins.variable}>
      <body>
        <SessionProvider session={session}>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
