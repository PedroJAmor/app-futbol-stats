"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PlayerEditor, { type EditablePlayer } from "./PlayerEditor";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";

export default function PlayerAdminActions({ player }: { player: EditablePlayer }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const router = useRouter();
  async function remove() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/jugadores/${player.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo borrar el jugador.");
      router.push("/jugadores"); router.refresh(); setConfirming(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo borrar el jugador."); }
    finally { pending.current = false; setBusy(false); }
  }
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  if (!isAdmin) return null;
  return <><button className="button" onClick={() => setOpen(true)}>Modificar jugador</button><button className="button danger" onClick={() => { setError(""); setConfirming(true); }}>Borrar jugador</button>{open && <PlayerEditor player={player} onClose={() => setOpen(false)} />}{confirming && <ConfirmActionDialog title="Borrar jugador" description={<>Se ocultará a {player.nickname || player.firstName} del directorio. Si tiene partidos registrados, el borrado se bloqueará para conservar su historial; podés marcarlo como inactivo.</>} confirmLabel="Confirmar borrado" busy={busy} error={error} onConfirm={remove} onClose={() => setConfirming(false)} />}</>;
}
