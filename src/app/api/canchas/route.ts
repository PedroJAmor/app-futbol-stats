import { checkReadRateLimit } from "@/features/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { requireRole } from "@/features/auth/session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { venueInputSchema } from "@/features/venues/schemas";
import { venueData, venueFailure, venueSelect } from "@/features/venues/service";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  try { return NextResponse.json(await prisma.venue.findMany({ orderBy: { name: "asc" }, select: venueSelect })); }
  catch (error) { return venueFailure(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); await requireRole("ADMIN");
    const input = venueInputSchema.parse(await readJsonBody(request));
    return NextResponse.json(await prisma.venue.create({ data: venueData(input), select: venueSelect }), { status: 201 });
  } catch (error) { return venueFailure(error); }
}
