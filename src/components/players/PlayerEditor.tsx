"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EditablePlayer = {
  id: number;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  birthDate?: string | Date | null;
  photoUrl?: string | null;
};

export default function PlayerEditor({ player, onClose }: { player?: EditablePlayer; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: player?.firstName ?? "",
    lastName: player?.lastName ?? "",
    nickname: player?.nickname ?? "",
    birthDate: player?.birthDate ? new Date(player.birthDate).toISOString().slice(0, 10) : "",
    photoUrl: player?.photoUrl ?? "",
  });
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError("La foto debe ser JPG, PNG o WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar los 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(String(reader.result));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let photoUrl = form.photoUrl;
      if (pendingImage) {
        const uploadResponse = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagen: pendingImage }) });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error ?? "No se pudo subir la foto");
        photoUrl = uploadData.url;
      }
      const response = await fetch(player ? `/api/jugadores/${player.id}` : "/api/jugadores", {
        method: player ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el jugador");
      onClose();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el jugador");
    } finally {
      setSaving(false);
    }
  }

  const photoPreview = pendingImage || form.photoUrl;
  return <div className="modal-backdrop" role="presentation"><section className="modal card" role="dialog" aria-modal="true" aria-label={player ? "Modificar jugador" : "Crear jugador"}><div className="row spread"><h2>{player ? "Modificar jugador" : "Crear jugador"}</h2><button className="button" type="button" onClick={onClose}>Cerrar</button></div><form className="stack" onSubmit={submit}><div className="player-photo-editor">{photoPreview ? <img src={photoPreview} alt="Vista previa del jugador" /> : <span aria-hidden="true">{form.firstName.trim().slice(0, 1) || "?"}</span>}<div className="stack"><label className="button photo-picker">Elegir foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} /></label>{photoPreview && <button className="button ghost" type="button" onClick={() => { setPendingImage(null); setForm({ ...form, photoUrl: "" }); }}>Quitar foto</button>}<small>JPG, PNG o WebP. Máximo 5 MB.</small></div></div><label className="field">Nombre<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required autoFocus /></label><label className="field">Apellido<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label><label className="field">Apodo<input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label><label className="field">Fecha de nacimiento<input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>{error && <p className="error">{error}</p>}<button className="button primary" disabled={saving}>{saving ? pendingImage ? "Subiendo foto..." : "Guardando..." : "Guardar jugador"}</button></form></section></div>;
}
