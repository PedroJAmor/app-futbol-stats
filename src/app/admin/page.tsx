"use client";
// src/app/admin/page.tsx
// Panel de carga: crear jugadores y partidos
// Solo accesible si la sesión tiene rol ADMIN

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Jugador = {
  id: number;
  nombre: string;
  apodo: string | null;
  foto: string | null;
};

type EquipoForm = {
  color: string;
  resultado: "WIN" | "LOSS" | "DRAW";
  jugadorIds: number[];
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirigir si no es admin
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
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <a href="#nuevo-jugador"><button>+ Nuevo jugador</button></a>
        <a href="#nuevo-partido"><button>+ Nuevo partido</button></a>
      </div>
      <FormJugador />
      <hr style={{ margin: "40px 0" }} />
      <FormPartido />
    </div>
  );
}

// ─── Formulario jugador ────────────────────────────────────────────────────

function FormJugador() {
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

    // Subir foto si hay
    if (foto) {
      const base64 = await fileToBase64(foto);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: base64 }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setMsg(`Error al subir foto: ${uploadData.error}`);
        setLoading(false);
        return;
      }
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
      setMsg(`✅ Jugador "${data.nombre}" creado correctamente`);
      setNombre(""); setApodo(""); setFechaNac(""); setFoto(null);
    }
    setLoading(false);
  };

  return (
    <section id="nuevo-jugador">
      <h2>Nuevo jugador</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
        <label style={labelStyle}>
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Apodo
          <input value={apodo} onChange={(e) => setApodo(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Fecha de nacimiento
          <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Foto
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        {msg && <p style={{ color: msg.startsWith("✅") ? "green" : "red" }}>{msg}</p>}
        <button type="submit" disabled={loading} style={{ padding: 10, cursor: "pointer" }}>
          {loading ? "Guardando..." : "Guardar jugador"}
        </button>
      </form>
    </section>
  );
}

// ─── Formulario partido ────────────────────────────────────────────────────

function FormPartido() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [fecha, setFecha]         = useState("");
  const [hora, setHora]           = useState("21:00");
  const [formato, setFormato]     = useState<5 | 7 | 11>(7);
  const [cancha, setCancha]       = useState("");
  const [precio, setPrecio]       = useState("");
  const [clima, setClima]         = useState("");
  const [temperatura, setTemp]    = useState("");
  const [notas, setNotas]         = useState("");
  const [mvpId, setMvpId]         = useState("");

  const [equipos, setEquipos] = useState<[EquipoForm, EquipoForm]>([
    { color: "Oscuro", resultado: "WIN",  jugadorIds: [] },
    { color: "Claro",  resultado: "LOSS", jugadorIds: [] },
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");

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

  const toggleJugadorEnEquipo = (equipoIdx: 0 | 1, jugadorId: number) => {
    const equipo = equipos[equipoIdx];
    const ids = equipo.jugadorIds.includes(jugadorId)
      ? equipo.jugadorIds.filter((id) => id !== jugadorId)
      : [...equipo.jugadorIds, jugadorId];
    updateEquipo(equipoIdx, { jugadorIds: ids });
  };

  // Cuando uno gana, el otro pierde automáticamente (a menos que sea empate)
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

    const res = await fetch("/api/partidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: fechaHora,
        formato,
        cancha: cancha || null,
        precio: precio ? Number(precio) : null,
        clima: clima || null,
        temperatura: temperatura ? Number(temperatura) : null,
        notas: notas || null,
        mvpId: mvpId ? Number(mvpId) : null,
        equipos: equipos.map((eq) => ({
          color: eq.color,
          resultado: eq.resultado,
          jugadorIds: eq.jugadorIds,
        })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data.error}`);
    } else {
      setMsg(`✅ Partido guardado correctamente (id: ${data.id})`);
      setFecha(""); setHora("21:00"); setCancha(""); setPrecio("");
      setClima(""); setTemp(""); setNotas(""); setMvpId("");
      setEquipos([
        { color: "Oscuro", resultado: "WIN",  jugadorIds: [] },
        { color: "Claro",  resultado: "LOSS", jugadorIds: [] },
      ]);
    }
    setLoading(false);
  };

  // Jugadores ya asignados a algún equipo
  const asignados = new Set([...equipos[0].jugadorIds, ...equipos[1].jugadorIds]);

  return (
    <section id="nuevo-partido">
      <h2>Nuevo partido</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Datos del partido */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          <label style={labelStyle}>
            Fecha *
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Hora
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Formato *
            <select value={formato} onChange={(e) => setFormato(Number(e.target.value) as 5 | 7 | 11)} style={inputStyle}>
              <option value={5}>F5</option>
              <option value={7}>F7</option>
              <option value={11}>F11</option>
            </select>
          </label>
          <label style={labelStyle}>
            Cancha
            <input value={cancha} onChange={(e) => setCancha(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Precio ($)
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Clima
            <select value={clima} onChange={(e) => setClima(e.target.value)} style={inputStyle}>
              <option value="">-</option>
              <option>Despejado</option>
              <option>Nublado</option>
              <option>Lluvioso</option>
              <option>Frío</option>
              <option>Caluroso</option>
            </select>
          </label>
          <label style={labelStyle}>
            Temperatura (°C)
            <input type="number" value={temperatura} onChange={(e) => setTemp(e.target.value)} style={inputStyle} />
          </label>
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

        {/* Equipos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {([0, 1] as const).map((idx) => (
            <div key={idx} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Equipo {idx + 1}</h3>

              <label style={labelStyle}>
                Color / Nombre
                <input
                  value={equipos[idx].color}
                  onChange={(e) => updateEquipo(idx, { color: e.target.value })}
                  required style={inputStyle}
                />
              </label>

              <label style={{ ...labelStyle, marginTop: 10 }}>
                Resultado
                <select
                  value={equipos[idx].resultado}
                  onChange={(e) => handleResultado(idx, e.target.value as "WIN" | "LOSS" | "DRAW")}
                  style={inputStyle}
                >
                  <option value="WIN">Ganó</option>
                  <option value="LOSS">Perdió</option>
                  <option value="DRAW">Empate</option>
                </select>
              </label>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                  Jugadores ({equipos[idx].jugadorIds.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {jugadores.map((j) => {
                    const enEsteEquipo = equipos[idx].jugadorIds.includes(j.id);
                    const enOtroEquipo = !enEsteEquipo && asignados.has(j.id);
                    return (
                      <button
                        key={j.id}
                        type="button"
                        disabled={enOtroEquipo}
                        onClick={() => toggleJugadorEnEquipo(idx, j.id)}
                        style={{
                          padding: "4px 10px", borderRadius: 16, fontSize: 12,
                          cursor: enOtroEquipo ? "default" : "pointer",
                          border: "1px solid #ccc",
                          background: enEsteEquipo ? "#333" : enOtroEquipo ? "#eee" : "#fff",
                          color: enEsteEquipo ? "#fff" : enOtroEquipo ? "#aaa" : "#333",
                        }}
                      >
                        {j.apodo ?? j.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {msg && <p style={{ color: msg.startsWith("✅") ? "green" : "red" }}>{msg}</p>}
        <div>
          <button type="submit" disabled={loading} style={{ padding: "10px 24px", cursor: "pointer" }}>
            {loading ? "Guardando..." : "Guardar partido"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4, fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  padding: "7px 10px", border: "1px solid #ccc",
  borderRadius: 4, fontSize: 14,
};
