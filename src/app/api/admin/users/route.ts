import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, authErrorStatus } from "@/features/auth/session";

export async function GET() {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.user.findMany({
      orderBy: { email: "asc" },
      include: { player: true },
    }));
  } catch (error) {
    return NextResponse.json({ error: "No autorizado" }, { status: authErrorStatus(error) });
  }
}
