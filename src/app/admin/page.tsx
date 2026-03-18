"use client";
// src/app/admin/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Jugador = {
  id: number;
  nombre: string;
  apodo: string | null;
  foto: string | null;
  fechaNac: string | null;
  activo: boolean;
};

type EquipoForm = {
  color: string;
  resultado: "WIN" | "LOSS" | "DRAW";
  jugadorIds: number[];
};

type Partido = {
  id: number;
  fecha: string;
  formato: number;
  cancha: string | null;
  precio: number | null;
  clima: string | null;
  temperatura: number | null;
  notas: string | null;
  mvpId: number | null;
  teams: {
    id: number;
    color: string;
    resultado: "WIN" | "LOSS" | "DRAW";
    players: { player: { id: number; nombre: string; apodo: string | null } }[];
  }[];
};

// ─── Navegación entre secciones ───────────────────────────────────────────────

type Seccion = "menu" | "nuevo-jugador" | "editar-jugador" | "nuevo-partido" | "editar-partido";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [seccion, setSeccion] = useState<Seccion>("menu");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") return <p>Cargando...</p>;
  if (status !== "authenticated") return null;

  return (
    <div>
      <h1>Panel de administración</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <button onClick={() => setSeccion("nuevo-jugador")}>+ Nuevo jugador</button>
        <button onClick={() => setSeccion("editar-jugador")}>Editar jugador</button>
        <button onClick={() => setSeccion("nuevo-partido")}>+ Nuevo partido</button>
        <button onClick={() => setSeccion("editar-partido")}>Editar partido</button>
      </div>

      {seccion === "nuevo-jugador"  && <FormJugador onDone={() => setSeccion("menu")} />}
      {seccion === "editar-jugador" && <EditarJugador onDone={() => setSeccion("menu")} />}
      {seccion === "nuevo-partido"  && <FormPartido onDone={() => setSeccion("menu")} />}
      {seccion === "editar-partido" && <EditarPartido onDone={() => setSeccion("menu")} />}

      {seccion === "menu" && (
        <p style={{ color: "#888" }}>Selecciona una acción arriba.</p>
      )}
    </div>
  );
}

// ─── Nuevo jugador ─────────────────────────────────────────────────────────────

function FormJugador({ onDone }: { onDone: () => void }) {
  const [nombre, setNombre]     = useState("");
  const [apodo, setApodo]       = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [foto, setFoto]         = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    let fotoUrl: string | null = null;
    if (foto) {
      const base64 = await fileToBase64(foto);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: base64 }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { setMsg(`Error al subir foto: ${uploadData.error}`); setLoading(false); return; }
      fotoUrl = uploadData.url;
    }

    const res = await fetch("/api/jugadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apodo: apodo || null, fechaNac: fechaNac || null, foto: fotoUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data.error}`);
    } else {
      setMsg(`Jugador "${data.nombre}" creado correctamente`);
      setNombre(""); setApodo(""); setFechaNac(""); setFoto(null);
    }
    setLoading(false);
  };

  return (
    <section>
      <h2>Nuevo jugador</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
        <label style={labelStyle}>Nombre * <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={inputStyle} /></label>
        <label style={labelStyle}>Apodo <input value={apodo} onChange={(e) => setApodo(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Fecha de nacimiento <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Foto <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></label>
        {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green" }}>{msg}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar jugador"}</button>
          <button type="button" onClick={onDone}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}

// ─── Editar jugador ────────────────────────────────────────────────────────────

function EditarJugador({ onDone }: { onDone: () => void }) {
  const [jugadores, setJugadores]   = useState<Jugador[]>([]);
  const [seleccionado, setSeleccionado] = useState<Jugador | null>(null);
  const [nombre, setNombre]         = useState("");
  const [apodo, setApodo]           = useState("");
  const [fechaNac, setFechaNac]     = useState("");
  const [activo, setActivo]         = useState(true);
  const [foto, setFoto]             = useState<File | null>(null);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState("");

  useEffect(() => {
    fetch("/api/jugadores")
      .then((r) => r.json())
      .then(setJugadores);
  }, []);

  const seleccionar = (j: Jugador) => {
    setSeleccionado(j);
    setNombre(j.nombre);
    setApodo(j.apodo ?? "");
    setFechaNac(j.fechaNac ? j.fechaNac.split("T")[0] : "");
    setActivo(j.activo);
    setFoto(null);
    setMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seleccionado) return;
    setLoading(true);
    setMsg("");

    let fotoUrl: string | undefined = undefined;
    if (foto) {
      const base64 = await fileToBase64(foto);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: base64 }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { setMsg(`Error al subir foto: ${uploadData.error}`); setLoading(false); return; }
      fotoUrl = uploadData.url;
    }

    const res = await fetch(`/api/jugadores/${seleccionado.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        apodo: apodo || null,
        fechaNac: fechaNac || null,
        activo,
        ...(fotoUrl !== undefined && { foto: fotoUrl }),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data.error}`);
    } else {
      setMsg(`Jugador actualizado correctamente`);
      // Refrescar lista
      const lista = await fetch("/api/jugadores").then((r) => r.json());
      setJugadores(lista);
      setSeleccionado(data);
    }
    setLoading(false);
  };

  return (
    <section>
      <h2>Editar jugador</h2>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>

        {/* Lista de jugadores */}
        <div style={{ border: "1px solid #ccc", borderRadius: 8, overflow: "hidden", maxHeight: 500, overflowY: "auto" }}>
          {jugadores.map((j) => (
            <div
              key={j.id}
              onClick={() => seleccionar(j)}
              style={{
                padding: "10px 14px", cursor: "pointer", fontSize: 14,
                background: seleccionado?.id === j.id ? "#333" : "transparent",
                color: seleccionado?.id === j.id ? "#fff" : j.activo ? "#000" : "#aaa",
                borderBottom: "1px solid #eee",
              }}
            >
              {j.nombre}
              {j.apodo && <span style={{ fontSize: 12, marginLeft: 6, opacity: 0.7 }}>"{j.apodo}"</span>}
              {!j.activo && <span style={{ fontSize: 11, marginLeft: 6, color: "#e55" }}>(inactivo)</span>}
            </div>
          ))}
        </div>

        {/* Formulario de edición */}
        {seleccionado ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
            <label style={labelStyle}>Nombre * <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={inputStyle} /></label>
            <label style={labelStyle}>Apodo <input value={apodo} onChange={(e) => setApodo(e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Fecha de nacimiento <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>
              Nueva foto (opcional)
              <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              {seleccionado.foto && !foto && <span style={{ fontSize: 12, color: "#888" }}>Ya tiene foto cargada</span>}
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              Jugador activo
            </label>
            {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green" }}>{msg}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</button>
              <button type="button" onClick={onDone}>Cancelar</button>
            </div>
          </form>
        ) : (
          <p style={{ color: "#888", paddingTop: 12 }}>Selecciona un jugador de la lista para editarlo.</p>
        )}
      </div>
    </section>
  );
}

// ─── Nuevo partido ─────────────────────────────────────────────────────────────

function FormPartido({ onDone, partidoInicial, onGuardado }: {
  onDone: () => void;
  partidoInicial?: Partido;
  onGuardado?: (p: Partido) => void;
}) {
  const esEdicion = !!partidoInicial;

  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [fecha, setFecha]         = useState(partidoInicial ? partidoInicial.fecha.split("T")[0] : "");
  const [hora, setHora]           = useState(partidoInicial ? partidoInicial.fecha.split("T")[1]?.slice(0, 5) : "21:00");
  const [formato, setFormato]     = useState<5 | 7 | 11>((partidoInicial?.formato as 5 | 7 | 11) ?? 7);
  const [cancha, setCancha]       = useState(partidoInicial?.cancha ?? "");
  const [precio, setPrecio]       = useState(partidoInicial?.precio?.toString() ?? "");
  const [clima, setClima]         = useState(partidoInicial?.clima ?? "");
  const [temperatura, setTemp]    = useState(partidoInicial?.temperatura?.toString() ?? "");
  const [notas, setNotas]         = useState(partidoInicial?.notas ?? "");
  const [mvpId, setMvpId]         = useState(partidoInicial?.mvpId?.toString() ?? "");
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState("");

  const equipoInicial = (idx: 0 | 1): EquipoForm => ({
    color: partidoInicial?.teams[idx]?.color ?? (idx === 0 ? "Oscuro" : "Claro"),
    resultado: (partidoInicial?.teams[idx]?.resultado ?? (idx === 0 ? "WIN" : "LOSS")) as "WIN" | "LOSS" | "DRAW",
    jugadorIds: partidoInicial?.teams[idx]?.players.map((p) => p.player.id) ?? [],
  });

  const [equipos, setEquipos] = useState<[EquipoForm, EquipoForm]>([
    equipoInicial(0), equipoInicial(1),
  ]);

  useEffect(() => {
    fetch("/api/jugadores")
      .then((r) => r.json())
      .then(setJugadores);
  }, []);

  const updateEquipo = (idx: 0 | 1, patch: Partial<EquipoForm>) => {
    setEquipos((prev) => {
      const next = [...prev] as [EquipoForm, EquipoForm];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const toggleJugador = (equipoIdx: 0 | 1, jugadorId: number) => {
    const ids = equipos[equipoIdx].jugadorIds.includes(jugadorId)
      ? equipos[equipoIdx].jugadorIds.filter((id) => id !== jugadorId)
      : [...equipos[equipoIdx].jugadorIds, jugadorId];
    updateEquipo(equipoIdx, { jugadorIds: ids });
  };

  const handleResultado = (idx: 0 | 1, valor: "WIN" | "LOSS" | "DRAW") => {
    if (valor === "DRAW") {
      updateEquipo(0, { resultado: "DRAW" });
      updateEquipo(1, { resultado: "DRAW" });
    } else {
      updateEquipo(idx, { resultado: valor });
      updateEquipo(idx === 0 ? 1 : 0, { resultado: valor === "WIN" ? "LOSS" : "WIN" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const fechaHora = `${fecha}T${hora}:00`;
    const body = {
      fecha: fechaHora, formato, cancha: cancha || null,
      precio: precio ? Number(precio) : null,
      clima: clima || null,
      temperatura: temperatura ? Number(temperatura) : null,
      notas: notas || null,
      mvpId: mvpId ? Number(mvpId) : null,
      equipos: equipos.map((eq) => ({
        color: eq.color, resultado: eq.resultado, jugadorIds: eq.jugadorIds,
      })),
    };

    const url    = esEdicion ? `/api/partidos/${partidoInicial!.id}` : "/api/partidos";
    const method = esEdicion ? "PUT" : "POST";

    // PUT solo actualiza los campos simples del partido (no los equipos/jugadores)
    // Para edicion de equipos/jugadores se necesitaria lógica mas compleja
    // Por ahora PUT actualiza todos los campos excepto los equipos
    const bodyParaPut = esEdicion
      ? { fecha: fechaHora, formato, cancha: cancha || null,
          precio: precio ? Number(precio) : null, clima: clima || null,
          temperatura: temperatura ? Number(temperatura) : null,
          notas: notas || null, mvpId: mvpId ? Number(mvpId) : null }
      : body;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyParaPut),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data.error}`);
    } else {
      setMsg(esEdicion ? "Partido actualizado correctamente" : `Partido guardado (id: ${data.id})`);
      if (!esEdicion) {
        setFecha(""); setHora("21:00"); setCancha(""); setPrecio("");
        setClima(""); setTemp(""); setNotas(""); setMvpId("");
        setEquipos([
          { color: "Oscuro", resultado: "WIN",  jugadorIds: [] },
          { color: "Claro",  resultado: "LOSS", jugadorIds: [] },
        ]);
      }
      onGuardado?.(data);
    }
    setLoading(false);
  };

  const asignados = new Set([...equipos[0].jugadorIds, ...equipos[1].jugadorIds]);

  return (
    <section>
      <h2>{esEdicion ? `Editando partido #${partidoInicial!.id}` : "Nuevo partido"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          <label style={labelStyle}>Fecha * <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={inputStyle} /></label>
          <label style={labelStyle}>Hora <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>
            Formato *
            <select value={formato} onChange={(e) => setFormato(Number(e.target.value) as 5 | 7 | 11)} style={inputStyle}>
              <option value={5}>F5</option>
              <option value={7}>F7</option>
              <option value={11}>F11</option>
            </select>
          </label>
          <label style={labelStyle}>Cancha <input value={cancha} onChange={(e) => setCancha(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Precio ($) <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>
            Clima
            <select value={clima} onChange={(e) => setClima(e.target.value)} style={inputStyle}>
              <option value="">-</option>
              <option>Despejado</option>
              <option>Nublado</option>
              <option>Lluvioso</option>
              <option>Frio</option>
              <option>Caluroso</option>
            </select>
          </label>
          <label style={labelStyle}>Temperatura (C) <input type="number" value={temperatura} onChange={(e) => setTemp(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>
            MVP
            <select value={mvpId} onChange={(e) => setMvpId(e.target.value)} style={inputStyle}>
              <option value="">Sin MVP</option>
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>{j.apodo ?? j.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Notas
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </label>

        {/* Equipos - solo en creacion o si no es edicion */}
        {!esEdicion && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {([0, 1] as const).map((idx) => (
              <div key={idx} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>Equipo {idx + 1}</h3>
                <label style={labelStyle}>
                  Color / Nombre
                  <input value={equipos[idx].color} onChange={(e) => updateEquipo(idx, { color: e.target.value })} required style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, marginTop: 10 }}>
                  Resultado
                  <select value={equipos[idx].resultado} onChange={(e) => handleResultado(idx, e.target.value as "WIN" | "LOSS" | "DRAW")} style={inputStyle}>
                    <option value="WIN">Gano</option>
                    <option value="LOSS">Perdio</option>
                    <option value="DRAW">Empate</option>
                  </select>
                </label>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Jugadores ({equipos[idx].jugadorIds.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {jugadores.map((j) => {
                      const enEste  = equipos[idx].jugadorIds.includes(j.id);
                      const enOtro  = !enEste && asignados.has(j.id);
                      return (
                        <button key={j.id} type="button" disabled={enOtro}
                          onClick={() => toggleJugador(idx, j.id)}
                          style={{ padding: "4px 10px", borderRadius: 16, fontSize: 12, cursor: enOtro ? "default" : "pointer",
                            border: "1px solid #ccc",
                            background: enEste ? "#333" : enOtro ? "#eee" : "#fff",
                            color: enEste ? "#fff" : enOtro ? "#aaa" : "#333" }}>
                          {j.apodo ?? j.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {esEdicion && (
          <p style={{ fontSize: 13, color: "#888", background: "#f9f9f9", padding: 12, borderRadius: 6 }}>
            Nota: al editar un partido solo se actualizan los datos generales (fecha, cancha, clima, resultado, MVP, etc.).
            Los jugadores de cada equipo no se modifican desde aqui para preservar la integridad del historial.
          </p>
        )}

        {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green" }}>{msg}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading}>{loading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Guardar partido"}</button>
          <button type="button" onClick={onDone}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}

// ─── Editar partido ────────────────────────────────────────────────────────────

function EditarPartido({ onDone }: { onDone: () => void }) {
  const [partidos, setPartidos]       = useState<Partido[]>([]);
  const [seleccionado, setSeleccionado] = useState<Partido | null>(null);
  const [loading, setLoading]         = useState(true);
  const [borrando, setBorrando]       = useState<number | null>(null);

  const borrarPartido = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // evitar que abra el formulario de edicion
    if (!confirm("Borrar este partido eliminara todos sus datos (equipos y jugadores del partido). Esta accion no se puede deshacer. Confirmar?")) return;
    setBorrando(id);
    const res = await fetch(`/api/partidos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPartidos((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Error al borrar el partido");
    }
    setBorrando(null);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/partidos").then((r) => r.json());
    setPartidos(data);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <p>Cargando partidos...</p>;

  if (seleccionado) {
    return (
      <FormPartido
        onDone={() => setSeleccionado(null)}
        partidoInicial={seleccionado}
        onGuardado={(actualizado) => {
          setSeleccionado(null);
          cargar();
        }}
      />
    );
  }

  return (
    <section>
      <h2>Editar partido</h2>
      <p style={{ fontSize: 14, color: "#555" }}>Selecciona el partido que queres editar.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600 }}>
        {partidos.map((p) => {
          const ganador = p.teams.find((t) => t.resultado === "WIN");
          const empate  = p.teams.every((t) => t.resultado === "DRAW");
          return (
            <div key={p.id} style={{
              border: "1px solid #ccc", borderRadius: 8, padding: "12px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div onClick={() => setSeleccionado(p)} style={{ cursor: "pointer", flex: 1 }}>
                <strong>{p.teams[0]?.color} vs {p.teams[1]?.color}</strong>
                <span style={{ marginLeft: 8, background: "#eee", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>F{p.formato}</span>
                <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                  {new Date(p.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                  {p.cancha && ` · ${p.cancha}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: empate ? "goldenrod" : "green" }}>
                  {empate ? "Empate" : `Gano ${ganador?.color}`}
                </span>
                <button
                  onClick={(e) => borrarPartido(p.id, e)}
                  disabled={borrando === p.id}
                  style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", background: "#fff", border: "1px solid #e55", borderRadius: 4, color: "#e55" }}
                >
                  {borrando === p.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={onDone}>Cancelar</button>
      </div>
    </section>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4, fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  padding: "7px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14,
};
