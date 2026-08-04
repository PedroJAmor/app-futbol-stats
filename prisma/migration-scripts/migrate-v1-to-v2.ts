import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { preflightV1 } from "./preflight-v1";
import { assertSafeStagingEnvironment } from "./guard-env";

async function main() {
  assertSafeStagingEnvironment();
  const prisma = new PrismaClient();
  const [state] = await prisma.$queryRawUnsafe<{ legacy_table: string | null }[]>(
    `SELECT to_regclass('"MatchPlayerStat"')::text AS legacy_table`
  );
  await prisma.$disconnect();
  if (state.legacy_table) await preflightV1();
  else console.log("Schema V1 ya no está presente; se omite preflight legacy");
  execFileSync(resolve("node_modules/.bin/prisma"), ["migrate", "deploy"], {
    stdio: "inherit",
    // Neon pooler can retain Prisma's session advisory lock after deploy.
    // This wrapper already enforces branch, host and staging tag before write.
    env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" },
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
