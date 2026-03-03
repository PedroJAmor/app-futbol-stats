// src/app/api/partidos/route.ts
// GET  /api/partidos          → lista todos los partidos (más recientes primero)
// POST /api/partidos          → carga un partido nuevo con sus equipos y jugadores (solo admin)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partidos = await prisma.match.findMany({
      orderBy: { fecha: "desc" },
      include: {
        teams: {
          include: {
            players: {
              include: {
                player: {
                  select: { id: true, nombre: true, apodo: true, foto: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(partidos);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener partidos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Estructura esperada:
    // {
    //   fecha: "2025-02-21T21:00:00",
    //   formato: 7,
    //   cancha: "Complejo El Gol",
    //   precio: 12000,
    //   clima: "Despejado",
    //   temperatura: 22,
    //   notas: "...",
    //   mvpId: 3,
    //   equipos: [
    //     { color: "Oscuro", resultado: "WIN", jugadorIds: [1, 2, 3, 4, 5, 6, 7] },
    //     { color: "Claro",  resultado: "LOSS", jugadorIds: [8, 9, 10, 11, 12, 13] }
    //   ]
    // }

    const { fecha, formato, cancha, precio, clima, temperatura, notas, mvpId, equipos } = body;

    // Validaciones básicas
    if (!fecha) {
      return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
    }
    if (!formato || ![5, 7, 11].includes(formato)) {
      return NextResponse.json({ error: "Formato inválido (debe ser 5, 7 u 11)" }, { status: 400 });
    }
    if (!equipos || equipos.length !== 2) {
      return NextResponse.json({ error: "Se necesitan exactamente 2 equipos" }, { status: 400 });
    }
    for (const eq of equipos) {
      if (!eq.color?.trim()) {
        return NextResponse.json({ error: "Cada equipo necesita un color/nombre" }, { status: 400 });
      }
      if (!["WIN", "LOSS", "DRAW"].includes(eq.resultado)) {
        return NextResponse.json({ error: "Resultado inválido" }, { status: 400 });
      }
      if (!eq.jugadorIds?.length) {
        return NextResponse.json({ error: "Cada equipo necesita al menos un jugador" }, { status: 400 });
      }
    }

    // Crear partido con equipos y jugadores en una sola transacción
    const partido = await prisma.match.create({
      data: {
        fecha: new Date(fecha),
        formato,
        cancha: cancha?.trim() || null,
        precio: precio ? Number(precio) : null,
        clima: clima?.trim() || null,
        temperatura: temperatura ? Number(temperatura) : null,
        notas: notas?.trim() || null,
        mvpId: mvpId ? Number(mvpId) : null,
        teams: {
          create: equipos.map((eq: any) => ({
            color: eq.color.trim(),
            resultado: eq.resultado,
            players: {
              create: eq.jugadorIds.map((playerId: number) => ({ playerId })),
            },
          })),
        },
      },
      include: {
        teams: {
          include: {
            players: {
              include: {
                player: {
                  select: { id: true, nombre: true, apodo: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(partido, { status: 201 });
  } catch (error) {
    console.error("Error al crear partido:", error);
    return NextResponse.json(
      { error: "Error al crear partido" },
      { status: 500 }
    );
  }
}
