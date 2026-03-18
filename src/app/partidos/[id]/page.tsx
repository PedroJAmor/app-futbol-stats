// src/app/partidos/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { buildDisplayNames } from "@/lib/displayName";

export const revalidate = 60;

async function getData(id: number) {
  const partido = await prisma.match.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          players: {
            include: {
              player: { select: { id: true, nombre: true, apodo: true, foto: true } },
            },
          },
        },
      },
    },
  });

  if (!partido) return null;

  let mvp = null;
  if (partido.mvpId) {
    mvp = await prisma.player.findUnique({
      where: { id: partido.mvpId },
      select: { id: true, nombre: true, apodo: true, foto: true },
    });
  }

  // Armar displayNames con todos los jugadores del partido
  const todosJugadores = partido.teams.flatMap(t =>
    t.players.map(p => ({ id: p.player.id, nombre: p.player.nombre, apodo: p.player.apodo }))
  );
  if (mvp && !todosJugadores.find(j => j.id === mvp.id)) {
    todosJugadores.push({ id: mvp.id, nombre: mvp.nombre, apodo: mvp.apodo });
  }
  const displayNames = buildDisplayNames(todosJugadores);
  return { partido, mvp, displayNames };
}

export default async function PartidoPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const data = await getData(id);
  if (!data) notFound();

  const { partido, mvp, displayNames } = data;
  const equipoGanador = partido.teams.find((t) => t.resultado === "WIN");
  const esEmpate = partido.teams.every((t) => t.resultado === "DRAW");

  return (
    <div>
      <Link href="/partidos">← Volver a partidos</Link>

      <div style={{ margin: "24px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <span style={{ background: "#eee", borderRadius: 4, padding: "2px 8px", fontSize: 13 }}>
            F{partido.formato}
          </span>
          {esEmpate
            ? <span style={{ background: "#fff3cd", borderRadius: 4, padding: "2px 8px", fontSize: 13, color: "#856404" }}>Empate</span>
            : equipoGanador
            ? <span style={{ background: "#d1e7dd", borderRadius: 4, padding: "2px 8px", fontSize: 13, color: "#0a3622" }}>Ganó {equipoGanador.color}</span>
            : null
          }
        </div>
        <h1 style={{ margin: 0 }}>
          {partido.teams[0]?.color} vs {partido.teams[1]?.color}
        </h1>
      </div>

      {/* Meta info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, padding: "16px", background: "#f5f5f5", borderRadius: 8, marginBottom: 32 }}>
        <MetaItem label="Fecha" value={
          new Date(partido.fecha).toLocaleDateString("es-AR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })
        } />
        <MetaItem label="Hora" value={
          new Date(partido.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
        } />
        {partido.cancha && <MetaItem label="Sede" value={partido.cancha} />}
        {partido.clima && <MetaItem label="Clima" value={partido.clima} />}
        {partido.temperatura != null && <MetaItem label="Temperatura" value={`${partido.temperatura}°C`} />}
        {partido.precio != null && <MetaItem label="Precio" value={`$${partido.precio.toLocaleString("es-AR")}`} />}
        {mvp && (
          <MetaItem label="MVP ⭐" value={displayNames.get(mvp.id) ?? mvp.nombre} />
        )}
      </div>

      {/* Equipos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {partido.teams.map((equipo) => (
          <div key={equipo.id} style={{
            border: equipo.resultado === "WIN" ? "2px solid green" : "1px solid #ccc",
            borderRadius: 8, padding: 16,
            background: equipo.resultado === "WIN" ? "#f0fff0" : equipo.resultado === "DRAW" ? "#fffdf0" : "#fff",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{equipo.color}</h2>
              {equipo.resultado === "WIN" && <span style={{ color: "green", fontWeight: 700, fontSize: 13 }}>GANADOR</span>}
              {equipo.resultado === "DRAW" && <span style={{ color: "goldenrod", fontWeight: 700, fontSize: 13 }}>EMPATE</span>}
              {equipo.resultado === "LOSS" && <span style={{ color: "red", fontWeight: 700, fontSize: 13 }}>PERDEDOR</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {equipo.players.map((ps) => (
                <Link key={ps.id} href={`/jugadores/${ps.player.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10 }}>
                  {ps.player.foto ? (
                    <Image
                      src={ps.player.foto}
                      alt={ps.player.nombre}
                      width={32}
                      height={32}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "#ddd", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {ps.player.nombre[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{displayNames.get(ps.player.id) ?? ps.player.nombre}</div>
                    {ps.player.apodo && <div style={{ fontSize: 12, color: "#666" }}>"{ps.player.apodo}"</div>}
                  </div>
                  {partido.mvpId === ps.player.id && <span>⭐</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {partido.notas && (
        <div style={{ marginTop: 24, padding: 16, background: "#f9f9f9", borderRadius: 8 }}>
          <strong>Notas:</strong>
          <p style={{ margin: "8px 0 0" }}>{partido.notas}</p>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}
