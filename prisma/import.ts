// prisma/import.ts
// Importa los datos desde el JSON de la app anterior
// Correr con: npx tsx prisma/import.ts
//
// IMPORTANTE: correr DESPUÉS de haber limpiado la DB
// (no debe haber jugadores ni partidos existentes)

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ─── Tipos del JSON viejo ────────────────────────────────────────────────────

type OldPlayer = {
  id: string;
  name: string;
  createdAt: string;
};

type OldMatch = {
  id: string;
  date: string;
  team1: string[];
  team2: string[];
  result: "team1" | "team2" | "draw";
  playersPerTeam: number;
  createdAt: string;
};

type OldData = {
  players: OldPlayer[];
  matches: OldMatch[];
};

async function main() {
  // ─── Leer el JSON ──────────────────────────────────────────────────────────
  const jsonPath = path.join(__dirname, "import-data.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("❌ No se encontró el archivo prisma/import-data.json");
    console.error("   Copiá el JSON exportado de la app vieja a ese path");
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data: OldData = JSON.parse(raw);

  console.log(`📦 Datos encontrados:`);
  console.log(`   ${data.players.length} jugadores`);
  console.log(`   ${data.matches.length} partidos`);
  console.log();

  // ─── Importar jugadores ────────────────────────────────────────────────────
  // Mapa de id viejo (string) → id nuevo (number) para usarlo en los partidos
  const playerIdMap = new Map<string, number>();

  console.log("👤 Importando jugadores...");

  for (const p of data.players) {
    const created = await prisma.player.create({
      data: {
        nombre: p.name,
        // Sin apodo, foto ni fechaNac — se pueden completar después desde el admin
        createdAt: new Date(p.createdAt),
      },
    });
    playerIdMap.set(p.id, created.id);
    console.log(`   ✓ ${p.name} (id nuevo: ${created.id})`);
  }

  console.log();

  // ─── Importar partidos ─────────────────────────────────────────────────────
  console.log("⚽ Importando partidos...");

  let importados = 0;
  let errores = 0;

  for (const m of data.matches) {
    // Mapear resultado
    let team1Result: "WIN" | "LOSS" | "DRAW";
    let team2Result: "WIN" | "LOSS" | "DRAW";

    if (m.result === "team1") {
      team1Result = "WIN";
      team2Result = "LOSS";
    } else if (m.result === "team2") {
      team1Result = "LOSS";
      team2Result = "WIN";
    } else {
      team1Result = "DRAW";
      team2Result = "DRAW";
    }

    // Resolver IDs de jugadores — filtrar los que no se encontraron
    const team1Ids = m.team1
      .map((oldId) => playerIdMap.get(oldId))
      .filter((id): id is number => id !== undefined);

    const team2Ids = m.team2
      .map((oldId) => playerIdMap.get(oldId))
      .filter((id): id is number => id !== undefined);

    if (team1Ids.length === 0 || team2Ids.length === 0) {
      console.error(`   ❌ Partido ${m.id}: no se pudieron resolver los jugadores`);
      errores++;
      continue;
    }

    try {
      const partido = await prisma.match.create({
        data: {
          fecha: new Date(m.date),
          formato: m.playersPerTeam,
          // cancha, precio, clima, temperatura: no estaban en la app vieja
          // se pueden completar después editando los partidos desde el admin
          createdAt: new Date(m.createdAt),
          teams: {
            create: [
              {
                color: "Oscuro",
                resultado: team1Result,
                players: {
                  create: team1Ids.map((playerId) => ({ playerId })),
                },
              },
              {
                color: "Claro",
                resultado: team2Result,
                players: {
                  create: team2Ids.map((playerId) => ({ playerId })),
                },
              },
            ],
          },
        },
      });

      const ganador =
        m.result === "team1" ? "Oscuro" : m.result === "team2" ? "Claro" : "Empate";

      console.log(
        `   ✓ ${new Date(m.date).toLocaleDateString("es-AR")} — F${m.playersPerTeam} — Ganó: ${ganador} (${team1Ids.length} vs ${team2Ids.length} jugadores)`
      );
      importados++;
    } catch (err) {
      console.error(`   ❌ Error en partido ${m.id}:`, err);
      errores++;
    }
  }

  // ─── Resumen ───────────────────────────────────────────────────────────────
  console.log();
  console.log("─────────────────────────────────────");
  console.log(`✅ Jugadores importados: ${playerIdMap.size}`);
  console.log(`✅ Partidos importados:  ${importados}`);
  if (errores > 0) console.log(`❌ Errores:              ${errores}`);
  console.log();
  console.log("Próximos pasos:");
  console.log("  1. Entrar al admin y completar apodos/fotos/fechas de nacimiento de los jugadores");
  console.log("  2. Editar los partidos para agregar cancha, clima, precio");
  console.log("  3. Asignar los colores reales de cada partido (por ahora todos quedaron Oscuro/Claro)");
}

main()
  .catch((e) => {
    console.error("❌ Error fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
