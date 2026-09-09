import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { argentinaFormToUtc } from "@/lib/dates";
import { getCurrentUser, requireRole, authErrorStatus } from "@/features/auth/session";
import { matchInputSchema } from "@/features/matches/schemas";
import { validateMatchInput } from "@/features/matches/validators";
import { resolveVenueId } from "@/features/matches/venues";

const matchInclude = {
  teams: { orderBy: { side: "asc" as const }, include: { participations: { include: { player: true } } } },
  mvp: true,
  venue: true,
};

export async function GET(request: NextRequest) {
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "1";
  const currentUser = includeHidden ? await getCurrentUser() : null;
  const maySeeHidden = includeHidden && currentUser && ["ADMIN", "SUPERADMIN"].includes(currentUser.role);
  return NextResponse.json(await prisma.match.findMany({
    where: maySeeHidden ? {} : { isHidden: false },
    orderBy: { playedAt: "desc" },
    include: matchInclude,
  }));
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN");
    const input = matchInputSchema.parse(await request.json());
    validateMatchInput(input);
    const match = await prisma.$transaction(async (tx) => {
      const venueId = await resolveVenueId(tx, input);
      const created = await tx.match.create({ data: {
        playedAt: argentinaFormToUtc(input.date, input.time),
        format: input.format,
        venueId,
        priceCents: input.priceCents ?? null,
        weather: input.weather || null,
        temperature: input.temperature,
        notes: input.notes || null,
        mvpId: input.mvpId,
      } });
      for (const team of input.teams) {
        const savedTeam = await tx.matchTeam.create({
          data: { matchId: created.id, side: team.side, color: team.color, result: team.result },
        });
        await tx.matchParticipation.createMany({
          data: team.playerIds.map((playerId) => ({ matchId: created.id, teamId: savedTeam.id, playerId })),
        });
      }
      return tx.match.findUniqueOrThrow({ where: { id: created.id }, include: matchInclude });
    });
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el partido" }, { status: authErrorStatus(error) || 400 });
  }
}
