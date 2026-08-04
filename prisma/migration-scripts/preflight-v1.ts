import { PrismaClient } from "@prisma/client";
import { assertSafeStagingEnvironment } from "./guard-env";

const prisma = new PrismaClient();

type IssueCounts = {
  matches_without_two_teams: number;
  players_in_both_teams: number;
  invalid_mvps: number;
  invalid_formats: number;
};

export async function preflightV1() {
  assertSafeStagingEnvironment();

  const [issues] = await prisma.$queryRawUnsafe<IssueCounts[]>(`
    SELECT
      (SELECT count(*)::int FROM (
        SELECT "matchId" FROM "MatchTeam" GROUP BY "matchId" HAVING count(*) <> 2
      ) q) AS matches_without_two_teams,
      (SELECT count(*)::int FROM (
        SELECT mt."matchId", mps."playerId"
        FROM "MatchPlayerStat" mps
        JOIN "MatchTeam" mt ON mt.id = mps."teamId"
        GROUP BY mt."matchId", mps."playerId"
        HAVING count(DISTINCT mps."teamId") > 1
      ) q) AS players_in_both_teams,
      (SELECT count(*)::int FROM "Match" m
        WHERE m."mvpId" IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM "MatchPlayerStat" mps
          JOIN "MatchTeam" mt ON mt.id = mps."teamId"
          WHERE mt."matchId" = m.id AND mps."playerId" = m."mvpId"
        )
      ) AS invalid_mvps,
      (SELECT count(*)::int FROM "Match" WHERE "formato" <= 0) AS invalid_formats
  `);

  const failures = Object.entries(issues).filter(([, count]) => count > 0);
  if (failures.length) {
    throw new Error(`Preflight V1 falló: ${JSON.stringify(Object.fromEntries(failures))}`);
  }

  console.log("Preflight V1 OK: equipos, participantes, MVP y formatos son compatibles");
}

if (require.main === module) {
  preflightV1()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
