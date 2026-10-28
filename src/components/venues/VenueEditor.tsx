"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerDialog from "@/components/players/PlayerDialog";
import { courtInputSchema, venueInputSchema } from "@/features/venues/schemas";
import "./venues.css";

export type VenueEditable = { id: number; name: string; address?: string | null; mapUrl?: string | null; photoUrl?: string | null };
export type CourtEditable = { id: number; name: string; format: number | null; photoUrl?: string | null; goals: { id: number; position: number; name: string }[] };
export default function VenueEditor({ venue, venueId, court, courtMode = false, onClose }: { venue?: VenueEditable; venueId?: number; court?: CourtEditable; courtMode?: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(courtMode ? court?.name ?? "" : venue?.name ?? "");
  const [address, setAddress] = useState(venue?.address ?? "");
  const [mapUrl, setMapUrl] = useState(venue?.mapUrl ?? "");
  const [photoUrl, setPhotoUrl] = useState((courtMode ? court?.photoUrl : venue?.photoUrl) ?? "");
  const [format, setFormat] = useState(court?.format?.toString() ?? "");
  const [goalNames, setGoalNames] = useState([court?.goals.find(goal => goal.position === 0)?.name ?? "", court?.goals.find(goal => goal.position === 1)?.name ?? ""]);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const title = courtMode ? court ? "Editar cancha" : "Agregar cancha" : venue ? "Editar predio" : "Crear predio";
  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Elegí una foto JPG, PNG o WebP de hasta 5 MB."); return; }
    const reader = new FileReader(); reader.onload = () => { setPendingImage(String(reader.result)); setError(""); }; reader.onerror = () => setError("No se pudo leer la foto."); reader.readAsDataURL(file);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current) return;
    if (courtMode && court?.goals.length && !goalNames.some(value => value.trim())) { setError("Los arcos con historial conservan sus nombres. Podés renombrarlos completando ambos campos."); return; }
    const input = courtMode ? { name, format: format === "" ? null : Number(format), photoUrl, ...(goalNames.some(value => value.trim()) && { goalNames }) } : { name, address, mapUrl, photoUrl };
    const parsed = (courtMode ? courtInputSchema : venueInputSchema).safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisá los datos."); return; }
    busy.current = true; setSaving(true); setError("");
    try {
      let savedPhoto = photoUrl;
      if (pendingImage) {
        const response = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagen: pendingImage, purpose: courtMode ? "court" : "venue" }) });
        const data = await response.json(); if (!response.ok || typeof data.url !== "string") throw new Error(data.error ?? "No se pudo subir la foto.");
        savedPhoto = data.url; setPhotoUrl(savedPhoto); setPendingImage(null);
      }
      const url = courtMode ? `/api/canchas/${venueId}/pistas${court ? `/${court.id}` : ""}` : `/api/canchas${venue ? `/${venue.id}` : ""}`;
      const response = await fetch(url, { method: (courtMode ? court : venue) ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...parsed.data, photoUrl: savedPhoto }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      onClose(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar. Probá nuevamente."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <PlayerDialog label={title} busy={saving} onClose={onClose}><div className="row spread"><h2>{title}</h2><button className="button" type="button" disabled={saving} onClick={onClose}>Cerrar</button></div><form className="stack" onSubmit={submit}><fieldset className="stack venue-editor-fields" disabled={saving}>
    <label className="field">Nombre<input autoFocus value={name} onChange={event => setName(event.target.value)} required maxLength={100} /></label>
    {courtMode ? <><label className="field">Formato (opcional)<input type="number" min="1" max="2147483647" value={format} onChange={event => setFormat(event.target.value)} placeholder="Sin especificar" /></label><div className="form-grid">{goalNames.map((value, index) => <label className="field" key={index}>Arco {index + 1} (opcional)<input value={value} maxLength={100} onChange={event => setGoalNames(current => current.map((name, i) => i === index ? event.target.value : name))} /></label>)}</div><small>Podés completar los dos arcos después. Cambiar sus nombres conserva el historial.</small></> : <><label className="field">Dirección (opcional)<input value={address} onChange={event => setAddress(event.target.value)} maxLength={500} /></label><label className="field">Enlace al mapa (opcional)<input type="url" value={mapUrl} onChange={event => setMapUrl(event.target.value)} placeholder="https://…" maxLength={2000} /></label></>}
    {(pendingImage || photoUrl) && <img className="venue-editor-preview" src={pendingImage || photoUrl} alt="Vista previa" />}
    <label className="button photo-picker">Elegir foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} /></label>
    {(pendingImage || photoUrl) && <button className="button ghost" type="button" onClick={() => { setPhotoUrl(""); setPendingImage(null); }}>Quitar foto</button>}
    <small>Foto opcional, JPG, PNG o WebP. Máximo 5 MB.</small>
    {error && <p className="error" role="alert">{error}</p>}<button className="button primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
  </fieldset></form></PlayerDialog>;
}
