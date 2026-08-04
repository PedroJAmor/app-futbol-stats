"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import MatchEditor, { type EditableMatch } from "./MatchEditor";

export default function MatchAdminActions({ match }: { match: EditableMatch }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  if (!isAdmin) return null;
  return <><button className="button" onClick={() => setOpen(true)}>Modificar partido</button>{open && <MatchEditor match={match} onClose={() => setOpen(false)} />}</>;
}
