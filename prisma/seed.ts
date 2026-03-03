// prisma/seed.ts
// Crea el usuario admin y datos de prueba para desarrollo
// Correr con: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ─── Usuario admin ──────────────────────────────────────────────────────
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash, role: "ADMIN" },
  });

  console.log("✅ Usuario admin creado");
  console.log(`   usuario: admin`);
  console.log(`   contraseña: ${password}`);
  console.log("   ⚠️  Cambiá la contraseña en producción (variable ADMIN_PASSWORD en .env)");

  // ─── Jugadores de prueba ────────────────────────────────────────────────
  const jugadores = await Promise.all([
    prisma.player.upsert({ where: { id: 1 }, update: {}, create: { nombre: "Matías García",    apodo: "Mati",   fechaNac: new Date("1995-03-12") } }),
    prisma.player.upsert({ where: { id: 2 }, update: {}, create: { nombre: "Lucas Fernández",  apodo: "Luqui",  fechaNac: new Date("1997-07-24") } }),
    prisma.player.upsert({ where: { id: 3 }, update: {}, create: { nombre: "Sebastián Ruiz",   apodo: "Seba",   fechaNac: new Date("1994-11-05") } }),
    prisma.player.upsert({ where: { id: 4 }, update: {}, create: { nombre: "Diego Morales",    apodo: "Diegui", fechaNac: new Date("1998-01-30") } }),
    prisma.player.upsert({ where: { id: 5 }, update: {}, create: { nombre: "Andrés López",     apodo: "Andre",  fechaNac: new Date("1996-09-18") } }),
    prisma.player.upsert({ where: { id: 6 }, update: {}, create: { nombre: "Nicolás Torres",   apodo: "Nico",   fechaNac: new Date("1999-04-22") } }),
  ]);

  console.log(`✅ ${jugadores.length} jugadores de prueba creados`);

  // ─── Partido de prueba ──────────────────────────────────────────────────
  // Verificar si ya existe para no duplicar datos
  const partidoExistente = await prisma.match.findFirst();
  if (partidoExistente) {
    console.log("ℹ️  Ya existe un partido de prueba, se omite la creación");
  } else {
    const partido = await prisma.match.create({
      data: {
        fecha: new Date("2025-02-21T21:00:00"),
        formato: 7,
        cancha: "Complejo El Gol",
        precio: 12000,
        clima: "Despejado",
        temperatura: 22,
        mvpId: jugadores[0].id,
        teams: {
          create: [
            {
              color: "Oscuro",
              resultado: "WIN",
              players: {
                create: [
                  { playerId: jugadores[0].id },
                  { playerId: jugadores[1].id },
                  { playerId: jugadores[2].id },
                ],
              },
            },
            {
              color: "Claro",
              resultado: "LOSS",
              players: {
                create: [
                  { playerId: jugadores[3].id },
                  { playerId: jugadores[4].id },
                  { playerId: jugadores[5].id },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Partido de prueba creado (id: ${partido.id})`);
  }
  console.log("\n🚀 Seed completado. Podés correr: npm run dev");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
