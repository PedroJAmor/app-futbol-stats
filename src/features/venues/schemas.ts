import { z } from "zod";

const name = z.string().trim().min(1, "El nombre es obligatorio.").max(100).transform(value => value.replace(/\s+/g, " "));
const optionalHttps = z.string().trim().max(2000).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}, "Usá un enlace HTTPS válido.").nullish();
export const venueInputSchema = z.object({
  name,
  address: z.string().trim().max(500).nullish(),
  mapUrl: optionalHttps,
  photoUrl: optionalHttps,
}).strict();
export const courtInputSchema = z.object({
  name,
  format: z.number().int().positive().max(2_147_483_647).nullish(),
  photoUrl: optionalHttps,
  goalNames: z.array(name).length(2, "Completá los nombres de ambos arcos.").optional(),
}).strict().refine(input => !input.goalNames || input.goalNames.length !== 2 || input.goalNames[0].toLocaleLowerCase("es-AR") !== input.goalNames[1].toLocaleLowerCase("es-AR"), { message: "Los arcos deben tener nombres distintos.", path: ["goalNames"] });
export type VenueInput = z.infer<typeof venueInputSchema>;
export type CourtInput = z.infer<typeof courtInputSchema>;
