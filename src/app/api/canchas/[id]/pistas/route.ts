import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/features/auth/session";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { courtInputSchema } from "@/features/venues/schemas";
import { routeId, saveCourt, venueFailure } from "@/features/venues/service";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); await requireRole("ADMIN");
    const venueId = routeId((await context.params).id);
    const input = courtInputSchema.parse(await readJsonBody(request));
    const court = await prisma.$transaction(tx => saveCourt(tx, venueId, input), { isolationLevel: "Serializable" });
    return NextResponse.json(court, { status: 201 });
  } catch (error) { return venueFailure(error); }
}
