"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import PlayerEditor, { type EditablePlayer } from "./PlayerEditor";

export default function PlayerAdminActions({ player }: { player: EditablePlayer }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  if (!isAdmin) return null;
  return <><button className="button" onClick={() => setOpen(true)}>Modificar jugador</button>{open && <PlayerEditor player={player} onClose={() => setOpen(false)} />}</>;
}
