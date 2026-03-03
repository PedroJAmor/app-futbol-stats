// src/app/jugadores/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcularStats } from "@/lib/stats";
import Image from "next/image";

export const revalidate = 60;

async function getData() {
  const [jugadores, rawStats] = await Promise.all([
    prisma.player.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.matchPlayerStat.findMany({
      include: {
        player: { select: { id: true, nombre: true, apodo: true, foto: true } },
        team: {
          select: {
            id: true,
            resultado: true,
            match: { select: { id: true, formato: true, fecha: true } },
          },
        },
      },
    }),
  ]);

  const stats = calcularStats(rawStats);
  const statsMap = new Map(stats.map((s) => [s.playerId, s]));

  return { jugadores, statsMap };
}

export default async function JugadoresPage() {
  const { jugadores, statsMap } = await getData();

  return (
    <div>
      <h1>Jugadores</h1>
      <p style={{ color: "#555" }}>{jugadores.length} jugadores registrados</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {jugadores.map((j) => {
          const s = statsMap.get(j.id);
          return (
            <Link key={j.id} href={`/jugadores/${j.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
                {j.foto ? (
                  <Image
                    src={j.foto}
                    alt={j.nombre}
                    width={64}
                    height={64}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "#ddd", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 700,
                  }}>
                    {j.nombre[0].toUpperCase()}
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <strong>{j.nombre}</strong>
                  {j.apodo && <div style={{ fontSize: 13, color: "#555" }}>"{j.apodo}"</div>}
                </div>

                {s && (
                  <div style={{ marginTop: 8, fontSize: 13, display: "flex", gap: 12 }}>
                    <span>PJ {s.pj}</span>
                    <span>Pts {s.pts}</span>
                    <span>%V {s.pctV}%</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
