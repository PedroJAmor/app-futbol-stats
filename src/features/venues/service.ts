import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authErrorStatus } from "@/features/auth/session";
import { securityErrorResponse } from "@/features/security/errors";
import type { CourtInput, VenueInput } from "./schemas";

export class VenueError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function routeId(raw: string) {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1 || Number(raw) > 2_147_483_647) throw new VenueError("Identificador inválido.", 400);
  return Number(raw);
}
export function venueFailure(error: unknown) {
  const security = securityErrorResponse(error);
  if (security) return security;
  const auth = authErrorStatus(error);
  if (auth === 401 || auth === 403) return NextResponse.json({ error: auth === 401 ? "Iniciá sesión para continuar." : "No tenés permiso para modificar canchas." }, { status: auth });
  if (error instanceof VenueError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Revisá los datos." }, { status: 400 });
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "P2002") return NextResponse.json({ error: "Ya existe ese nombre en el catálogo." }, { status: 409 });
  if (code === "P2034") return NextResponse.json({ error: "Los datos cambiaron mientras guardabas. Volvé a intentar." }, { status: 409 });
  return NextResponse.json({ error: "No se pudo guardar la información. Probá nuevamente." }, { status: 500 });
}
export const courtSelect = {
  id: true, venueId: true, name: true, format: true, photoUrl: true,
  goals: { orderBy: { position: "asc" as const }, select: { id: true, position: true, name: true } },
} satisfies Prisma.CourtSelect;
export const venueSelect = {
  id: true, name: true, address: true, mapUrl: true, photoUrl: true,
  courts: { orderBy: { name: "asc" as const }, select: courtSelect },
} satisfies Prisma.VenueSelect;
export function venueData(input: VenueInput) {
  return { name: input.name, normalizedName: input.name.toLocaleLowerCase("es-AR"), address: input.address || null, mapUrl: input.mapUrl || null, photoUrl: input.photoUrl || null };
}
export async function saveCourt(tx: Prisma.TransactionClient, venueId: number, input: CourtInput, courtId?: number) {
  if (!await tx.venue.findUnique({ where: { id: venueId }, select: { id: true } })) throw new VenueError("El predio no existe.", 404);
  if (courtId) {
    const court = await tx.court.findFirst({ where: { id: courtId, venueId }, select: { id: true } });
    if (!court) throw new VenueError("La cancha no pertenece a este predio.", 404);
  }
  const data = { name: input.name, normalizedName: input.name.toLocaleLowerCase("es-AR"), format: input.format ?? null, photoUrl: input.photoUrl || null };
  const court = courtId ? await tx.court.update({ where: { id: courtId }, data }) : await tx.court.create({ data: { ...data, venueId } });
  if (input.goalNames) {
    for (const position of [0, 1]) await tx.goal.upsert({
      where: { courtId_position: { courtId: court.id, position } },
      create: { courtId: court.id, position, name: input.goalNames[position] },
      update: { name: input.goalNames[position] },
    });
  }
  return tx.court.findUniqueOrThrow({ where: { id: court.id }, select: courtSelect });
}
