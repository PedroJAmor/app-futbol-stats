import { ZodError } from "zod";
import { authErrorStatus } from "@/features/auth/session";

import { MatchRequestError } from "./request-error";
export { MatchRequestError } from "./request-error";

export function parseMatchId(value: string) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
    throw new MatchRequestError("ID de partido inválido");
  }
  return id;
}

export function matchError(error: unknown, fallback: string) {
  if (error instanceof MatchRequestError) return { status: error.status, message: error.message };
  const status = authErrorStatus(error);
  if (status === 401 || status === 403) return { status, message: status === 401 ? "Iniciá sesión para administrar partidos." : "No tenés permiso para administrar partidos." };
  if (error instanceof ZodError) return { status: 400, message: error.issues[0]?.message ?? "Datos del partido inválidos." };
  if (error instanceof SyntaxError) return { status: 400, message: "El cuerpo de la solicitud no es válido." };
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "P2025") return { status: 404, message: "Partido no encontrado." };
  if (code === "P2034") return { status: 409, message: "Los datos cambiaron mientras guardabas. Volvé a intentar." };
  if (code === "P2002" || code === "P2003") return { status: 409, message: "Los datos seleccionados cambiaron. Revisá los jugadores y la cancha." };
  return { status: 500, message: fallback };
}
