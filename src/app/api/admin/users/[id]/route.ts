import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { securityErrorResponse } from "@/features/security/errors";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, authErrorStatus } from "@/features/auth/session";
import { z, ZodError } from "zod";
import { adminUserInput, AdminUserError, updateAdminUser } from "@/features/auth/admin-users";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireRole("ADMIN");
    const id = z.string().cuid().parse((await params).id);
    const body = adminUserInput.parse(await readJsonBody(request));
    return NextResponse.json(await prisma.$transaction(tx => updateAdminUser(tx, actor, id, body), { isolationLevel: "Serializable" }));
  } catch (error) {
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    if (error instanceof AdminUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Datos de usuario inválidos." }, { status: 400 });
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "P2002" || code === "P2034" || code === "P2003") return NextResponse.json({ error: code === "P2002" ? "Ese jugador ya está vinculado a otra cuenta." : "Los datos cambiaron mientras guardabas. Volvé a intentar." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: authErrorStatus(error) });
  }
}
