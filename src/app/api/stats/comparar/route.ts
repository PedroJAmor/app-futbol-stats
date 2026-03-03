// src/app/api/stats/comparar/route.ts
// GET /api/stats/comparar?ids=1,2,3&formato=7&fechaDesde=...&fechaHasta=...
// Devuelve estadísticas del grupo: cuándo jugaron juntos, participación cruzada
// y stats individuales de cada uno con el filtro activo

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularStatsGrupo, buildMatchWhere } from "@/lib/stats";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // IDs separados por coma: ?ids=1,2,3
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json(
        { error: "Se requiere el parámetro ids" },
        { status: 400 }
      );
    }

    const playerIds = idsParam
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));

    if (playerIds.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 jugadores" },
        { status: 400 }
      );
    }

    const formato = searchParams.get("formato")
      ? Number(searchParams.get("formato"))
      : undefined;
    const fechaDesde = searchParams.get("fechaDesde") ?? undefined;
    const fechaHasta = searchParams.get("fechaHasta") ?? undefined;

    const matchWhere = buildMatchWhere({ formato, fechaDesde, fechaHasta });

    // Traer todos los stats de los jugadores seleccionados
    // (necesitamos los de TODOS los jugadores para calcular la participación cruzada)
    const rawStats = await prisma.matchPlayerStat.findMany({
      where: {
        playerId: { in: playerIds },
        team: { match: matchWhere },
      },
      include: {
        player: {
          select: { id: true, nombre: true, apodo: true, foto: true },
        },
        team: {
          select: {
            id: true,
            resultado: true,
            match: {
              select: { id: true, formato: true, fecha: true },
            },
          },
        },
      },
    });

    const grupoStats = calcularStatsGrupo(playerIds, rawStats);

    return NextResponse.json(grupoStats);
  } catch (error) {
    console.error("Error en comparación:", error);
    return NextResponse.json(
      { error: "Error al calcular estadísticas del grupo" },
      { status: 500 }
    );
  }
}
