"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import VenueEditor, { type CourtEditable, type VenueEditable } from "./VenueEditor";
export default function VenueAdminActions({ venue, court, createCourt = false, createVenue = false }: { venue?: VenueEditable; court?: CourtEditable; createCourt?: boolean; createVenue?: boolean }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  if (!["ADMIN", "SUPERADMIN"].includes(session?.user.role ?? "")) return null;
  const courtMode = Boolean(court || createCourt);
  return <><button className="button" type="button" onClick={() => setOpen(true)}>{createVenue ? "+ Crear predio" : createCourt ? "+ Agregar cancha" : court ? "Editar cancha" : "Editar predio"}</button>{open && <VenueEditor venue={createVenue ? undefined : venue} venueId={venue?.id} court={court} courtMode={courtMode} onClose={() => setOpen(false)} />}</>;
}
