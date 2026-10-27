import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, authErrorStatus } from "@/features/auth/session";
import { z, ZodError } from "zod";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const id = z.string().cuid().parse(params.id);
    return NextResponse.json(await prisma.forumPost.update({
      where: { id },
      data: { isHidden: true, deletedAt: new Date(), text: "[contenido eliminado]" },
    }));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "ID de publicación inválido." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Publicación no encontrada." }, { status: 404 });
    return NextResponse.json({ error: "No se pudo moderar el contenido" }, { status: authErrorStatus(error) });
  }
}
