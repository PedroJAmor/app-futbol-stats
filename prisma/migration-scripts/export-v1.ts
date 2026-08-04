import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertSafeStagingEnvironment } from "./guard-env";

const prisma = new PrismaClient();

async function main() {
  assertSafeStagingEnvironment();
  const output = resolve(process.argv[2] ?? "/private/tmp/futbol-amigos-v1-export.json");
  const [users, players, matches, teams, participations] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT * FROM "User" ORDER BY id`),
    prisma.$queryRawUnsafe(`SELECT * FROM "Player" ORDER BY id`),
    prisma.$queryRawUnsafe(`SELECT * FROM "Match" ORDER BY id`),
    prisma.$queryRawUnsafe(`SELECT * FROM "MatchTeam" ORDER BY id`),
    prisma.$queryRawUnsafe(`SELECT * FROM "MatchPlayerStat" ORDER BY id`),
  ]);
  writeFileSync(output, JSON.stringify({ users, players, matches, teams, participations }, null, 2));
  console.log(`Export V1 creado en ${output}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
