import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }));
}
