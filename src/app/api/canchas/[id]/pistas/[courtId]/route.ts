import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/features/auth/session";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { courtInputSchema } from "@/features/venues/schemas";
import { routeId, saveCourt, venueFailure } from "@/features/venues/service";
export async function PUT(request: Request, context: { params: Promise<{ id: string; courtId: string }> }) {
  try {
    assertSameOrigin(request); await requireRole("ADMIN");
    const params = await context.params;
    const venueId = routeId(params.id), courtId = routeId(params.courtId);
    const input = courtInputSchema.parse(await readJsonBody(request));
    const court = await prisma.$transaction(tx => saveCourt(tx, venueId, input, courtId), { isolationLevel: "Serializable" });
    return NextResponse.json(court);
  } catch (error) { return venueFailure(error); }
}
