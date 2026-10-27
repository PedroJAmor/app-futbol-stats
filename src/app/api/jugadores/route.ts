import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/features/auth/session";
import { playerCreateSchema, playerBirthDate } from "@/features/players/schemas";
import { playerError } from "@/features/players/errors";

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
    include: { _count: { select: { participations: { where: { match: { isHidden: false } } } } } },
  });
  if (sort === "popular") {
    players.sort((a, b) => b._count.participations - a._count.participations || a.firstName.localeCompare(b.firstName, "es"));
  }
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = playerCreateSchema.parse(await request.json());
    return NextResponse.json(await prisma.player.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName || null,
        nickname: body.nickname || null,
        photoUrl: body.photoUrl || null,
        birthDate: playerBirthDate(body.birthDate),
        isActive: body.isActive,
      },
    }), { status: 201 });
  } catch (error) {
    const failure = playerError(error, "No se pudo crear el jugador.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
