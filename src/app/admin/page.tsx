"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatPlayerName } from "@/lib/displayName";

type Role = "USER" | "ADMIN" | "SUPERADMIN";
type Player = { id: number; firstName: string; lastName: string | null; nickname: string | null; legacyFullName: string | null };
type User = { id: string; email: string | null; name: string | null; role: Role; playerId: number | null };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const loadRequest = useRef<AbortController | null>(null);
  const saveRequest = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  const authorized = status === "authenticated" && session.user.role !== "USER";

  const load = useCallback(async () => {
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const [usersResponse, playersResponse] = await Promise.all([
        fetch("/api/admin/users", { signal: controller.signal }),
        fetch("/api/jugadores", { signal: controller.signal }),
      ]);
      if (!usersResponse.ok || !playersResponse.ok) throw new Error("LOAD_FAILED");
      const [nextUsers, nextPlayers] = await Promise.all([usersResponse.json(), playersResponse.json()]);
      if (!Array.isArray(nextUsers) || !Array.isArray(nextPlayers)) throw new Error("INVALID_RESPONSE");
      if (!controller.signal.aborted && mounted.current) { setUsers(nextUsers); setPlayers(nextPlayers); }
    } catch {
      if (!controller.signal.aborted && mounted.current) setError("No se pudieron cargar las cuentas. Revisá tu conexión y volvé a intentar.");
    } finally {
      if (!controller.signal.aborted && mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session.user.role === "USER")) router.push("/perfil");
  }, [router, session, status]);

  useEffect(() => {
    mounted.current = true;
    saving.current = false;
    setSavingId(null);
    if (authorized) void load();
    return () => { mounted.current = false; loadRequest.current?.abort(); saveRequest.current?.abort(); saveRequest.current = null; };
  }, [load, authorized]);

  async function patchUser(id: string, body: { role?: Role; playerId?: number | null }) {
    if (saving.current) return;
    saving.current = true;
    const controller = new AbortController(); saveRequest.current = controller;
    setSavingId(id);
    setError("");
    let failureMessage = "No se pudo actualizar la cuenta. Revisá tu conexión y volvé a intentar.";
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) { failureMessage = typeof data.error === "string" ? data.error : "No se pudo actualizar la cuenta."; throw new Error("SAVE_FAILED"); }
      if (!controller.signal.aborted && mounted.current) await load();
    } catch {
      if (!controller.signal.aborted && mounted.current) setError(failureMessage);
    } finally {
      if (saveRequest.current === controller) {
        saving.current = false;
        if (!controller.signal.aborted && mounted.current) setSavingId(null);
      }
    }
  }

  if (status !== "authenticated" || session.user.role === "USER") return <p>Cargando...</p>;
  const isSuperadmin = session.user.role === "SUPERADMIN";

  return <div className="page admin-accounts-page">
    <section className="page-intro">
      <p className="eyebrow">Acceso y perfiles</p>
      <h1>Administración de cuentas</h1>
      <p className="muted">Vinculá cada cuenta con su jugador.{isSuperadmin ? " Como superadmin también podés administrar roles." : ""}</p>
    </section>
    {error && <div className="stack"><p className="error" role="alert">{error}</p><button className="button" disabled={loading || savingId !== null} onClick={() => void load()}>Volver a cargar cuentas</button></div>}
    {loading ? <p>Cargando cuentas...</p> : <section className="stack">
      {users.map((user) => <article className="card account-admin-card" key={user.id}>
        <div className="account-admin-heading">
          <div><strong>{user.name ?? "Cuenta sin nombre"}</strong><p className="muted">{user.email ?? "Sin email"}</p></div>
          {!isSuperadmin && <span className="pill">{user.role}</span>}
        </div>
        <div className="form-grid">
          {isSuperadmin && <label className="field">Rol<select value={user.role} disabled={savingId !== null} onChange={(event) => void patchUser(user.id, { role: event.target.value as Role })}><option value="USER">Usuario</option><option value="ADMIN">Administrador</option><option value="SUPERADMIN">Superadmin</option></select></label>}
          <label className="field">Jugador vinculado<select value={user.playerId ?? ""} disabled={savingId !== null} onChange={(event) => void patchUser(user.id, { playerId: event.target.value ? Number(event.target.value) : null })}><option value="">Sin jugador vinculado</option>{players.map((player) => <option key={player.id} value={player.id}>{formatPlayerName(player)}</option>)}</select></label>
        </div>
        {savingId === user.id && <small className="muted">Guardando...</small>}
      </article>)}
    </section>}
  </div>;
}
