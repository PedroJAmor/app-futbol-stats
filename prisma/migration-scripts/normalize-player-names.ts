import { PrismaClient } from "@prisma/client";
import { splitLastName } from "../../src/lib/displayName";
import { assertSafeStagingEnvironment } from "./guard-env";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  assertSafeStagingEnvironment();
  const players = await prisma.player.findMany({
    where: { OR: [{ lastName: null }, { lastName: "" }] },
    orderBy: { id: "asc" },
    select: { id: true, firstName: true, lastName: true, legacyFullName: true },
  });
  const changes = players.flatMap((player) => {
    const split = splitLastName(player.firstName);
    return split ? [{ id: player.id, before: player.firstName, ...split }] : [];
  });

  console.log(`${changes.length} de ${players.length} jugadores sin apellido pueden normalizarse.`);
  console.table(changes);
  if (!apply) {
    console.log("Vista previa solamente. Para aplicar: npm run db:normalize:players:apply");
    return;
  }

  await prisma.$transaction(changes.map(({ id, firstName, lastName }) => prisma.player.update({
    where: { id },
    data: { firstName, lastName },
  })));
  console.log(`Normalización aplicada a ${changes.length} jugadores. legacyFullName fue preservado.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
