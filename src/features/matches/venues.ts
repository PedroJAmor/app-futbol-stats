import type { Prisma } from "@prisma/client";
import type { MatchInput } from "./schemas";

export function cleanVenueName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeVenueName(value: string) {
  return cleanVenueName(value).toLocaleLowerCase("es-AR");
}

export async function resolveVenueId(tx: Prisma.TransactionClient, input: MatchInput) {
  if (input.newVenueName) {
    const name = cleanVenueName(input.newVenueName);
    const venue = await tx.venue.upsert({
      where: { normalizedName: normalizeVenueName(name) },
      update: {},
      create: { name, normalizedName: normalizeVenueName(name) },
    });
    return venue.id;
  }

  if (!input.venueId) return null;
  const venue = await tx.venue.findUnique({ where: { id: input.venueId }, select: { id: true } });
  if (!venue) throw new Error("La cancha seleccionada no existe");
  return venue.id;
}
