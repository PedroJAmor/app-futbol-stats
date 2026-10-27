import { checkReadRateLimit } from "@/features/security/rate-limit";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  return NextResponse.json(await prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }));
}
