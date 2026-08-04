import { PrismaClient } from "@prisma/client";
import { assertSafeStagingEnvironment } from "./guard-env";

const prisma = new PrismaClient();

async function main() {
  assertSafeStagingEnvironment();
  const [counts] = await prisma.$queryRawUnsafe<Record<string, number>[]>(`
    SELECT
      (SELECT count(*)::int FROM "LegacyCredentialUser") AS legacy_users,
      (SELECT count(*)::int FROM "Player") AS players,
      (SELECT count(*)::int FROM "Match") AS matches,
      (SELECT count(*)::int FROM "MatchTeam") AS teams,
      (SELECT count(*)::int FROM "MatchParticipation") AS participations,
      (SELECT count(*)::int FROM "MatchParticipation" WHERE "matchId" IS NULL) AS missing_match_ids,
      (SELECT count(*)::int FROM "Match" WHERE "format" <= 0) AS invalid_formats,
      (SELECT count(*)::int FROM (
        SELECT "matchId" FROM "MatchTeam" GROUP BY "matchId" HAVING count(*) <> 2
      ) q) AS matches_without_two_teams,
      (SELECT count(*)::int FROM (
        SELECT "matchId", "playerId" FROM "MatchParticipation"
        GROUP BY "matchId", "playerId" HAVING count(*) > 1
      ) q) AS duplicate_participations
  `);

  const failures = ["missing_match_ids", "invalid_formats", "matches_without_two_teams", "duplicate_participations"]
    .filter((key) => counts[key] > 0);
  if (failures.length) throw new Error(`Validación V2 falló: ${failures.join(", ")}`);

  console.log("Validación V2 OK");
  console.table(counts);
  console.log("Auditoría de fechas: playedAt preserva exactamente los timestamps V1; revisar visualmente en America/Argentina/Buenos_Aires.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
