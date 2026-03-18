"use client";
// src/app/estadisticas/page.tsx
// Client component: filtros, ordenamiento y comparación de jugadores son interactivos

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type PlayerStats = {
  playerId: number;
  nombre: string;
  apodo: string | null;
  foto: string | null;
  pj: number;
  v: number;
  e: number;
  d: number;
  pts: number;
  pctV: number;
  pctD: number;
};

type GrupoStats = {
  juntos: { pj: number; v: number; e: number; d: number; pctV: number; pctD: number };
  participacion: Record<number, { playerId: number; nombre: string; apodo: string | null; pjConGrupo: number; pjTotal: number; pctConGrupo: number }>;
  statsIndividuales: PlayerStats[];
  h2h: {
    pj: number;
    v: number;
    e: number;
    d: number;
    pctV: number;
    jugadores: [
      { playerId: number; nombre: string; apodo: string | null },
      { playerId: number; nombre: string; apodo: string | null }
    ];
  } | null;
};

type SortCol = "pj" | "v" | "e" | "d" | "pts" | "pctV" | "pctD";

const COLS: { key: SortCol; label: string }[] = [
  { key: "pj",   label: "PJ" },
  { key: "v",    label: "V" },
  { key: "e",    label: "E" },
  { key: "d",    label: "D" },
  { key: "pts",  label: "Pts" },
  { key: "pctV", label: "%V" },
  { key: "pctD", label: "%D" },
];

export default function EstadisticasPage() {
  // Filtros
  const [formato, setFormato]       = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pjMinimo, setPjMinimo]     = useState(0);

  // Tabla
  const [stats, setStats]       = useState<PlayerStats[]>([]);
  const [sortCol, setSortCol]   = useState<SortCol>("pts");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [loading, setLoading]   = useState(true);

  // Comparación de jugadores
  const [todosJugadores, setTodosJugadores] = useState<PlayerStats[]>([]);
  const [seleccionados, setSeleccionados]   = useState<number[]>([]);
  const [grupoStats, setGrupoStats]         = useState<GrupoStats | null>(null);
  const [loadingGrupo, setLoadingGrupo]     = useState(false);

  // ─── Cargar estadísticas individuales ────────────────────────────────────
  const cargarStats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (formato)    params.set("formato", formato);
    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (pjMinimo)   params.set("pjMinimo", String(pjMinimo));

    const res = await fetch(`/api/stats?${params}`);
    const data = await res.json();
    setStats(data.stats ?? []);
    setLoading(false);
  }, [formato, fechaDesde, fechaHasta, pjMinimo]);

  // Cargar todos los jugadores (sin filtro) para el selector de comparación
  const cargarTodos = useCallback(async () => {
    const res = await fetch("/api/stats");
    const data = await res.json();
    setTodosJugadores(data.stats ?? []);
  }, []);

  useEffect(() => { cargarStats(); }, [cargarStats]);
  useEffect(() => { cargarTodos(); }, [cargarTodos]);

  // ─── Comparación de grupo ─────────────────────────────────────────────────
  const compararGrupo = useCallback(async () => {
    if (seleccionados.length < 2) return;
    setLoadingGrupo(true);

    const params = new URLSearchParams();
    params.set("ids", seleccionados.join(","));
    if (formato)    params.set("formato", formato);
    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);

    const res = await fetch(`/api/stats/comparar?${params}`);
    const data = await res.json();
    setGrupoStats(data);
    setLoadingGrupo(false);
  }, [seleccionados, formato, fechaDesde, fechaHasta]);

  const toggleJugador = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setGrupoStats(null);
  };

  // ─── Ordenamiento ─────────────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sorted = [...stats].sort((a, b) =>
    sortDir === "desc" ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]
  );

  return (
    <div>
      <h1>Estadísticas avanzadas</h1>

      {/* ─── Filtros ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16, background: "#f5f5f5", borderRadius: 8, marginBottom: 24 }}>
        <label style={labelStyle}>
          Formato
          <select value={formato} onChange={(e) => setFormato(e.target.value)} style={inputStyle}>
            <option value="">Todos</option>
            <option value="5">F5</option>
            <option value="7">F7</option>
            <option value="11">F11</option>
          </select>
        </label>

        <label style={labelStyle}>
          Desde
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Hasta
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Mín. partidos
          <input type="number" min={0} value={pjMinimo} onChange={(e) => setPjMinimo(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
        </label>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button onClick={cargarStats}>Aplicar filtros</button>
          <button onClick={() => { setFormato(""); setFechaDesde(""); setFechaHasta(""); setPjMinimo(0); }}>
            Limpiar
          </button>
        </div>
      </div>

      {/* ─── Tabla individual ────────────────────────────────────────────── */}
      {loading ? (
        <p>Cargando...</p>
      ) : sorted.length === 0 ? (
        <p>Sin resultados para los filtros seleccionados.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: 48 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    style={{ ...thStyle, cursor: "pointer", userSelect: "none", background: sortCol === c.key ? "#e8e8e8" : "transparent" }}
                  >
                    {c.label} {sortCol === c.key ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((j, i) => (
                <tr key={j.playerId}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <Link href={`/jugadores/${j.playerId}`}>
                      {j.apodo ?? j.nombre}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{j.pj}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{j.v}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{j.e}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{j.d}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: sortCol === "pts" ? 700 : 400 }}>{j.pts}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{j.pctV}%</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{j.pctD}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Comparación de jugadores ────────────────────────────────────── */}
      <section>
        <h2>Comparar jugadores</h2>
        <p style={{ color: "#555", fontSize: 14 }}>
          Seleccioná 2 o más jugadores para ver sus estadísticas cuando jugaron juntos.
          Los filtros de arriba se aplican también acá.
        </p>

        {/* Selector: chips de jugadores */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Seleccionados:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, minHeight: 36 }}>
            {seleccionados.length === 0 && (
              <span style={{ color: "#aaa", fontSize: 14 }}>Ninguno</span>
            )}
            {seleccionados.map((id) => {
              const j = todosJugadores.find((x) => x.playerId === id);
              return (
                <span key={id} style={{ background: "#333", color: "#fff", borderRadius: 16, padding: "4px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {j?.apodo ?? j?.nombre ?? id}
                  <button onClick={() => toggleJugador(id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              );
            })}
          </div>

          {/* Lista de todos los jugadores para seleccionar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {todosJugadores.map((j) => {
              const seleccionado = seleccionados.includes(j.playerId);
              return (
                <button
                  key={j.playerId}
                  onClick={() => toggleJugador(j.playerId)}
                  style={{
                    padding: "5px 12px", borderRadius: 16, fontSize: 13,
                    cursor: "pointer", border: "1px solid #ccc",
                    background: seleccionado ? "#333" : "#fff",
                    color: seleccionado ? "#fff" : "#333",
                  }}
                >
                  {j.apodo ?? j.nombre}
                </button>
              );
            })}
          </div>
        </div>

        {seleccionados.length >= 2 && (
          <button onClick={compararGrupo} disabled={loadingGrupo}>
            {loadingGrupo ? "Calculando..." : "Ver estadísticas del grupo"}
          </button>
        )}

        {/* Resultado de la comparación */}
        {grupoStats && (
          <div style={{ marginTop: 24 }}>

            {/* Stats del grupo juntos */}
            <h3>Cuando jugaron juntos (mismo equipo)</h3>
            {grupoStats.juntos.pj === 0 ? (
              <p>No jugaron juntos en el mismo equipo con los filtros seleccionados.</p>
            ) : (
              <div style={{ display: "flex", gap: 24, padding: "16px 0", borderBottom: "1px solid #eee", marginBottom: 24 }}>
                {[
                  ["PJ juntos", grupoStats.juntos.pj],
                  ["V", grupoStats.juntos.v],
                  ["E", grupoStats.juntos.e],
                  ["D", grupoStats.juntos.d],
                  ["%V", `${grupoStats.juntos.pctV}%`],
                  ["%D", `${grupoStats.juntos.pctD}%`],
                ].map(([label, value]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                    <div style={{ fontSize: 12, color: "#777", textTransform: "uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Participación cruzada */}
            <h3>Participación cruzada</h3>
            <p style={{ fontSize: 14, color: "#555" }}>
              Del total de partidos de cada jugador, qué porcentaje los jugó con todo el grupo seleccionado.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
                  <th style={thStyle}>PJ total</th>
                  <th style={thStyle}>PJ con el grupo</th>
                  <th style={thStyle}>% con el grupo</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(grupoStats.participacion).map((p) => (
                  <tr key={p.playerId}>
                    <td style={tdStyle}>
                      <Link href={`/jugadores/${p.playerId}`}>{p.apodo ?? p.nombre}</Link>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{p.pjTotal}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{p.pjConGrupo}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{p.pctConGrupo}%</td>
                  </tr>
                ))}
              </tbody>
            </table>


            {/* Head to head - solo para 2 jugadores */}
            {grupoStats.h2h && (
              <div style={{ marginBottom: 24 }}>
                <h3>
                  Head to head: {grupoStats.h2h.jugadores[0].apodo ?? grupoStats.h2h.jugadores[0].nombre}
                  {" vs "}
                  {grupoStats.h2h.jugadores[1].apodo ?? grupoStats.h2h.jugadores[1].nombre}
                </h3>
                {grupoStats.h2h.pj === 0 ? (
                  <p>No se enfrentaron en ningun partido con los filtros seleccionados.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
                        <th style={thStyle}>PJ enfrentados</th>
                        <th style={thStyle}>V</th>
                        <th style={thStyle}>E</th>
                        <th style={thStyle}>D</th>
                        <th style={thStyle}>%V</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={tdStyle}>
                          <Link href={`/jugadores/${grupoStats.h2h.jugadores[0].playerId}`}>
                            {grupoStats.h2h.jugadores[0].apodo ?? grupoStats.h2h.jugadores[0].nombre}
                          </Link>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.pj}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.v}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.e}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.d}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.pctV}%</td>
                      </tr>
                      <tr>
                        <td style={tdStyle}>
                          <Link href={`/jugadores/${grupoStats.h2h.jugadores[1].playerId}`}>
                            {grupoStats.h2h.jugadores[1].apodo ?? grupoStats.h2h.jugadores[1].nombre}
                          </Link>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.pj}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.d}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.e}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{grupoStats.h2h.v}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{100 - grupoStats.h2h.pctV - (grupoStats.h2h.e > 0 ? Math.round((grupoStats.h2h.e / grupoStats.h2h.pj) * 100) : 0)}%</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Stats individuales comparados */}
            <h3>Estadísticas individuales comparadas</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
                  {COLS.map((c) => <th key={c.key} style={thStyle}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {grupoStats.statsIndividuales.map((j) => (
                  <tr key={j.playerId}>
                    <td style={tdStyle}>
                      <Link href={`/jugadores/${j.playerId}`}>{j.apodo ?? j.nombre}</Link>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pj}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.v}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.e}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.d}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pts}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pctV}%</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{j.pctD}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4, fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14,
};
const thStyle: React.CSSProperties = {
  padding: "8px 10px", borderBottom: "2px solid #ccc",
  textAlign: "center", fontSize: 13, whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "8px 10px", borderBottom: "1px solid #eee",
};
