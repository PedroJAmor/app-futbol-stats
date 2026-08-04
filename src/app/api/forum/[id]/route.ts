import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, authErrorStatus } from "@/features/auth/session";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    return NextResponse.json(await prisma.forumPost.update({
      where: { id: params.id },
      data: { isHidden: true, deletedAt: new Date(), text: "[contenido eliminado]" },
    }));
  } catch (error) {
    return NextResponse.json({ error: "No se pudo moderar el contenido" }, { status: authErrorStatus(error) });
  }
}
