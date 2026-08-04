import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, authErrorStatus } from "@/features/auth/session";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const body = await request.json();
    if (body.role !== undefined && actor.role !== "SUPERADMIN") throw new Error("FORBIDDEN");
    return NextResponse.json(await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.role !== undefined && { role: body.role }),
        ...(body.playerId !== undefined && { playerId: body.playerId ? Number(body.playerId) : null }),
      },
      include: { player: true },
    }));
  } catch (error) {
    return NextResponse.json({ error: "No se pudo actualizar el usuario" }, { status: authErrorStatus(error) });
  }
}
