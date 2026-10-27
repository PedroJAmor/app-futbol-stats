import { z } from "zod";

function validBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const optionalText = z.string().trim().max(100, "El texto no puede superar 100 caracteres.").nullable().optional();
const birthDate = z.string().trim().refine(value => !value || validBirthDate(value), "La fecha de nacimiento no es válida.").nullable().optional();
const photoUrl = z.string().trim().refine(value => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "La foto debe usar una dirección HTTP o HTTPS válida.").nullable().optional();
const booleanState = z.boolean({ invalid_type_error: "El estado debe ser verdadero o falso." });

const editableFields = {
  firstName: z.string().trim().min(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar 100 caracteres."),
  lastName: optionalText,
  nickname: optionalText,
  birthDate,
  photoUrl,
  isActive: booleanState,
};

export const playerCreateSchema = z.object({ ...editableFields, isActive: booleanState.default(true) }).strict();
export const playerUpdateSchema = z.object({ ...editableFields, isHidden: booleanState }).partial().strict().refine(value => Object.keys(value).length > 0, "No hay cambios para guardar.");
export type PlayerUpdateInput = z.infer<typeof playerUpdateSchema>;

export function playerBirthDate(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

export class PlayerRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function parsePlayerId(value: string) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
    throw new PlayerRequestError("ID de jugador inválido.", 400);
  }
  return id;
}
