// src/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcularStats, statsParaHome } from "@/lib/stats";

export const revalidate = 60; // refresca cada 60 segundos

async function getData() {
  const [rawStats, totalPartidos, ultimosPartidos] = await Promise.all([
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
    prisma.match.count(),
    prisma.match.findMany({
      take: 3,
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
    }),
  ]);

  const allStats = calcularStats(rawStats);
  const topPuntos = [...allStats].sort((a, b) => b.pts - a.pts).slice(0, 10);
  const topPctV = statsParaHome(allStats, totalPartidos);

  return { topPuntos, topPctV, ultimosPartidos, totalPartidos };
}

export default async function HomePage() {
  const { topPuntos, topPctV, ultimosPartidos, totalPartidos } = await getData();

  return (
    <div>
      <h1>⚽ Fútbol Amigos</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <Link href="/partidos">
          <button>Ver partidos</button>
        </Link>
        <Link href="/jugadores">
          <button>Ver jugadores</button>
        </Link>
        <Link href="/estadisticas">
          <button>Estadísticas avanzadas</button>
        </Link>
      </div>

      {/* Últimos partidos */}
      <section style={{ marginBottom: 40 }}>
        <h2>Últimos partidos</h2>
        {ultimosPartidos.length === 0 ? (
          <p>No hay partidos registrados todavía.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ultimosPartidos.map((p) => {
              const equipoGanador = p.teams.find((t) => t.resultado === "WIN");
              const esEmpate = p.teams.every((t) => t.resultado === "DRAW");
              return (
                <Link key={p.id} href={`/partidos/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
                    <div>
                      <strong>
                        {p.teams[0]?.color} vs {p.teams[1]?.color}
                      </strong>{" "}
                      — F{p.formato}
                    </div>
                    <div style={{ fontSize: 14, color: "#555" }}>
                      {new Date(p.fecha).toLocaleDateString("es-AR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}{" "}
                      {new Date(p.fecha).toLocaleTimeString("es-AR", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {esEmpate
                        ? "Empate"
                        : equipoGanador
                        ? `Ganó: ${equipoGanador.color}`
                        : ""}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Tablas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* Tabla de puntos */}
        <section>
          <h2>Tabla de puntos</h2>
          {topPuntos.length === 0 ? (
            <p>Sin datos.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
                  <th style={thStyle}>PJ</th>
                  <th style={thStyle}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {topPuntos.map((j, i) => (
                  <tr key={j.playerId}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>
                      <Link href={`/jugadores/${j.playerId}`}>
                        {j.apodo ?? j.nombre}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pj}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Tabla de % victorias */}
        <section>
          <h2>% Victorias</h2>
          {totalPartidos < 1 ? (
            <p>Sin datos.</p>
          ) : topPctV.length === 0 ? (
            <p>Aún no hay jugadores con 5 o más partidos.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
                  <th style={thStyle}>PJ</th>
                  <th style={thStyle}>%V</th>
                </tr>
              </thead>
              <tbody>
                {topPctV.map((j, i) => (
                  <tr key={j.playerId}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>
                      <Link href={`/jugadores/${j.playerId}`}>
                        {j.apodo ?? j.nombre}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pj}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pctV}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "2px solid #ccc",
  textAlign: "center",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #eee",
};
