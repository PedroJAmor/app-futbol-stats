// src/app/api/stats/route.ts
// GET /api/stats?formato=7&fechaDesde=2025-01-01&fechaHasta=2025-12-31&pjMinimo=3
// Devuelve estadísticas individuales de todos los jugadores con filtros opcionales

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularStats, buildMatchWhere } from "@/lib/stats";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const formato = searchParams.get("formato")
      ? Number(searchParams.get("formato"))
      : undefined;
    const fechaDesde = searchParams.get("fechaDesde") ?? undefined;
    const fechaHasta = searchParams.get("fechaHasta") ?? undefined;
    const pjMinimo = searchParams.get("pjMinimo")
      ? Number(searchParams.get("pjMinimo"))
      : 0;

    const matchWhere = buildMatchWhere({ formato, fechaDesde, fechaHasta });

    const rawStats = await prisma.matchPlayerStat.findMany({
      where: {
        team: {
          match: matchWhere,
        },
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

    const stats = calcularStats(rawStats, pjMinimo);

    // Total de partidos jugados (para la lógica del home)
    const totalPartidos = await prisma.match.count({
      where: matchWhere,
    });

    return NextResponse.json({ stats, totalPartidos });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al calcular estadísticas" },
      { status: 500 }
    );
  }
}
