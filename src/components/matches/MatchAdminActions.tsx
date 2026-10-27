"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import MatchEditor, { type EditableMatch } from "./MatchEditor";

export default function MatchAdminActions({ match }: { match: EditableMatch }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const router = useRouter();
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  if (!isAdmin) return null;
  async function hideMatch() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/partidos/${match.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo borrar el partido.");
      setConfirming(false);
      router.push("/partidos");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo borrar el partido.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <><div className="row"><button className="button" onClick={() => setOpen(true)}>Modificar partido</button><button className="button danger" onClick={() => { setError(""); setConfirming(true); }}>Borrar partido</button></div>{open && <MatchEditor match={match} onClose={() => setOpen(false)} />}
    {confirming && <ConfirmActionDialog title="Borrar partido" description={<p>El partido se ocultará y dejará de contar en las estadísticas públicas. Podrás restaurarlo desde Partidos activando «Mostrar partidos ocultos».</p>} confirmLabel="Borrar partido" busy={busy} error={error} onConfirm={hideMatch} onClose={() => { if (!pending.current) setConfirming(false); }} />}
  </>;
}
