import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/features/auth/session";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { checkReadRateLimit } from "@/features/security/rate-limit";
import { venueInputSchema } from "@/features/venues/schemas";
import { routeId, venueData, venueFailure, venueSelect, VenueError } from "@/features/venues/service";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const limited = await checkReadRateLimit(request); if (limited) return limited;
  try {
    const id = routeId((await context.params).id);
    const venue = await prisma.venue.findUnique({ where: { id }, select: venueSelect });
    if (!venue) throw new VenueError("El predio no existe.", 404);
    return NextResponse.json(venue);
  } catch (error) { return venueFailure(error); }
}
export async function PUT(request: Request, context: Context) {
  try {
    assertSameOrigin(request); await requireRole("ADMIN");
    const id = routeId((await context.params).id);
    const input = venueInputSchema.parse(await readJsonBody(request));
    if (!await prisma.venue.findUnique({ where: { id }, select: { id: true } })) throw new VenueError("El predio no existe.", 404);
    return NextResponse.json(await prisma.venue.update({ where: { id }, data: venueData(input), select: venueSelect }));
  } catch (error) { return venueFailure(error); }
}
