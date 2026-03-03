// src/app/jugadores/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { calcularStats } from "@/lib/stats";

export const revalidate = 60;

async function getData(id: number) {
  const [jugador, rawStats] = await Promise.all([
    prisma.player.findUnique({
      where: { id },
      include: {
        stats: {
          include: {
            team: {
              include: {
                match: {
                  select: { id: true, fecha: true, formato: true, cancha: true, mvpId: true },
                },
              },
            },
          },
          orderBy: { team: { match: { fecha: "desc" } } },
        },
      },
    }),
    prisma.matchPlayerStat.findMany({
      where: { playerId: id },
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

  if (!jugador) return null;

  const [statsData] = calcularStats(rawStats);

  return { jugador, stats: statsData ?? null };
}

function ResultadoBadge({ resultado }: { resultado: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    WIN:  { label: "V", color: "green" },
    DRAW: { label: "E", color: "goldenrod" },
    LOSS: { label: "D", color: "red" },
  };
  const { label, color } = cfg[resultado] ?? { label: "?", color: "gray" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: "50%",
      background: color, color: "#fff",
      fontWeight: 700, fontSize: 12,
    }}>
      {label}
    </span>
  );
}

export default async function JugadorPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const data = await getData(id);
  if (!data) notFound();

  const { jugador, stats } = data;

  const edad = jugador.fechaNac
    ? Math.floor((Date.now() - new Date(jugador.fechaNac).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // Últimos 5 partidos
  const ultimos5 = jugador.stats.slice(0, 5);

  return (
    <div>
      <Link href="/jugadores">← Volver a jugadores</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 20, margin: "24px 0" }}>
        {jugador.foto ? (
          <Image
            src={jugador.foto}
            alt={jugador.nombre}
            width={96}
            height={96}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: 96, height: 96, borderRadius: "50%",
            background: "#ddd", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 36, fontWeight: 700,
          }}>
            {jugador.nombre[0].toUpperCase()}
          </div>
        )}

        <div>
          <h1 style={{ margin: 0 }}>{jugador.nombre}</h1>
          {jugador.apodo && <div style={{ color: "#555" }}>"{jugador.apodo}"</div>}
          {jugador.fechaNac && (
            <div style={{ fontSize: 14, color: "#777", marginTop: 4 }}>
              {new Date(jugador.fechaNac).toLocaleDateString("es-AR")}
              {edad !== null && ` · ${edad} años`}
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas generales */}
      {stats && (
        <div style={{ display: "flex", gap: 24, marginBottom: 24, padding: "16px 0", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
          {[
            ["PJ", stats.pj],
            ["V", stats.v],
            ["E", stats.e],
            ["D", stats.d],
            ["Pts", stats.pts],
            ["%V", `${stats.pctV}%`],
            ["%D", `${stats.pctD}%`],
          ].map(([label, value]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 12, color: "#777", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Últimos 5 partidos */}
      {ultimos5.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2>Últimos {ultimos5.length} partidos</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {ultimos5.map((s) => (
              <ResultadoBadge key={s.id} resultado={s.team.resultado} />
            ))}
          </div>
        </div>
      )}

      {/* Todos los partidos */}
      <section>
        <h2>Historial de partidos</h2>
        {jugador.stats.length === 0 ? (
          <p>No hay partidos registrados.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Formato</th>
                <th style={thStyle}>Equipo</th>
                <th style={thStyle}>Resultado</th>
                <th style={thStyle}>MVP</th>
              </tr>
            </thead>
            <tbody>
              {jugador.stats.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>
                    <Link href={`/partidos/${s.team.match.id}`}>
                      {new Date(s.team.match.fecha).toLocaleDateString("es-AR")}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>F{s.team.match.formato}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{s.team.color}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <ResultadoBadge resultado={s.team.resultado} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {s.team.match.mvpId === jugador.id ? "⭐" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 10px", borderBottom: "2px solid #ccc",
  textAlign: "left", fontSize: 13,
};
const tdStyle: React.CSSProperties = {
  padding: "8px 10px", borderBottom: "1px solid #eee",
};
