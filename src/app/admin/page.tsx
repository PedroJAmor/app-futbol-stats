"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [usersResponse, playersResponse] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/jugadores"),
    ]);
    if (!usersResponse.ok || !playersResponse.ok) {
      setError("No se pudieron cargar las cuentas.");
      setLoading(false);
      return;
    }
    setUsers(await usersResponse.json());
    setPlayers(await playersResponse.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session.user.role === "USER")) router.push("/perfil");
  }, [router, session, status]);

  useEffect(() => {
    if (status === "authenticated" && session.user.role !== "USER") void load();
  }, [load, session, status]);

  async function patchUser(id: string, body: { role?: Role; playerId?: number | null }) {
    setSavingId(id);
    setError("");
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingId(null);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "No se pudo actualizar la cuenta.");
      return;
    }
    await load();
  }

  if (status !== "authenticated" || session.user.role === "USER") return <p>Cargando...</p>;
  const isSuperadmin = session.user.role === "SUPERADMIN";

  return <div className="page admin-accounts-page">
    <section className="page-intro">
      <p className="eyebrow">Acceso y perfiles</p>
      <h1>Administración de cuentas</h1>
      <p className="muted">Vinculá cada cuenta con su jugador.{isSuperadmin ? " Como superadmin también podés administrar roles." : ""}</p>
    </section>
    {error && <p className="error">{error}</p>}
    {loading ? <p>Cargando cuentas...</p> : <section className="stack">
      {users.map((user) => <article className="card account-admin-card" key={user.id}>
        <div className="account-admin-heading">
          <div><strong>{user.name ?? "Cuenta sin nombre"}</strong><p className="muted">{user.email ?? "Sin email"}</p></div>
          {!isSuperadmin && <span className="pill">{user.role}</span>}
        </div>
        <div className="form-grid">
          {isSuperadmin && <label className="field">Rol<select value={user.role} disabled={savingId === user.id} onChange={(event) => void patchUser(user.id, { role: event.target.value as Role })}><option value="USER">Usuario</option><option value="ADMIN">Administrador</option><option value="SUPERADMIN">Superadmin</option></select></label>}
          <label className="field">Jugador vinculado<select value={user.playerId ?? ""} disabled={savingId === user.id} onChange={(event) => void patchUser(user.id, { playerId: event.target.value ? Number(event.target.value) : null })}><option value="">Sin jugador vinculado</option>{players.map((player) => <option key={player.id} value={player.id}>{formatPlayerName(player)}</option>)}</select></label>
        </div>
        {savingId === user.id && <small className="muted">Guardando...</small>}
      </article>)}
    </section>}
  </div>;
}
