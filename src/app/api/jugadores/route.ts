import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole, authErrorStatus } from "@/features/auth/session";

export async function GET(request: NextRequest) {
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "1";
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "1";
  const sort = request.nextUrl.searchParams.get("sort");
  const currentUser = includeHidden ? await getCurrentUser() : null;
  const maySeeHidden = includeHidden && currentUser && ["ADMIN", "SUPERADMIN"].includes(currentUser.role);
  const players = await prisma.player.findMany({
    where: {
      ...(!maySeeHidden && { isHidden: false }),
      ...(activeOnly && { isActive: true }),
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { _count: { select: { participations: true } } },
  });
  if (sort === "popular") {
    players.sort((a, b) => b._count.participations - a._count.participations || a.firstName.localeCompare(b.firstName, "es"));
  }
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();
    if (!body.firstName?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    return NextResponse.json(await prisma.player.create({
      data: {
        firstName: body.firstName.trim(),
        lastName: body.lastName?.trim() || null,
        nickname: body.nickname?.trim() || null,
        photoUrl: body.photoUrl || null,
        birthDate: body.birthDate ? new Date(`${body.birthDate}T12:00:00Z`) : null,
      },
    }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "No se pudo crear el jugador" }, { status: authErrorStatus(error) });
  }
}
