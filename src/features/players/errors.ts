import { ZodError } from "zod";
import { authErrorStatus } from "@/features/auth/session";
import { PlayerRequestError } from "./schemas";

export function playerError(error: unknown, fallback: string) {
  if (error instanceof PlayerRequestError) return { status: error.status, message: error.message };
  const authStatus = authErrorStatus(error);
  if (authStatus === 401 || authStatus === 403) return { status: authStatus, message: authStatus === 401 ? "Iniciá sesión para administrar jugadores." : "No tenés permiso para administrar jugadores." };
  if (error instanceof ZodError) return { status: 400, message: error.issues[0]?.message ?? "Datos del jugador inválidos." };
  if (error instanceof SyntaxError) return { status: 400, message: "El cuerpo de la solicitud no es válido." };
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "P2025") return { status: 404, message: "Jugador no encontrado." };
  if (code === "P2034") return { status: 409, message: "Los datos cambiaron mientras guardabas. Volvé a intentar." };
  if (code === "P2002" || code === "P2003") return { status: 409, message: "No se pudo guardar por un conflicto con los datos existentes." };
  return { status: 500, message: fallback };
}
