// src/app/partidos/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

async function getData() {
  return prisma.match.findMany({
    orderBy: { fecha: "desc" },
    include: {
      teams: {
        include: {
          players: {
            include: {
              player: { select: { id: true, nombre: true, apodo: true } },
            },
          },
        },
      },
    },
  });
}

export default async function PartidosPage() {
  const partidos = await getData();

  return (
    <div>
      <h1>Partidos</h1>
      <p style={{ color: "#555" }}>{partidos.length} partidos jugados</p>

      {partidos.length === 0 ? (
        <p>No hay partidos registrados todavía.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {partidos.map((p) => {
            const equipoGanador = p.teams.find((t) => t.resultado === "WIN");
            const esEmpate = p.teams.every((t) => t.resultado === "DRAW");

            return (
              <Link key={p.id} href={`/partidos/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div>
                      <strong>{p.teams[0]?.color} vs {p.teams[1]?.color}</strong>
                      {" "}
                      <span style={{ background: "#eee", borderRadius: 4, padding: "2px 7px", fontSize: 12 }}>
                        F{p.formato}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                      {new Date(p.fecha).toLocaleDateString("es-AR", {
                        weekday: "short", day: "numeric", month: "short", year: "numeric",
                      })}
                      {" · "}
                      {new Date(p.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      {p.cancha && ` · ${p.cancha}`}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: 14 }}>
                    {esEmpate
                      ? <span style={{ color: "goldenrod", fontWeight: 600 }}>Empate</span>
                      : equipoGanador
                      ? <span style={{ color: "green", fontWeight: 600 }}>Ganó {equipoGanador.color}</span>
                      : null
                    }
                    {p.clima && (
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {p.clima}{p.temperatura != null ? ` · ${p.temperatura}°C` : ""}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
