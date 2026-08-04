import { execFileSync } from "node:child_process";

const EXPECTED_GIT_BRANCH = "rebuild-v2";
const EXPECTED_SAFETY_TAG = "rebuild-v2/staging";

export function assertSafeStagingEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  const expectedHost = process.env.EXPECTED_DATABASE_HOST;
  const safetyTag = process.env.DATABASE_SAFETY_TAG;

  if (!databaseUrl || !expectedHost) {
    throw new Error("DATABASE_URL y EXPECTED_DATABASE_HOST son obligatorios");
  }

  const actualHost = new URL(databaseUrl).hostname;
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();

  if (branch !== EXPECTED_GIT_BRANCH) {
    throw new Error(`Branch Git insegura: se esperaba ${EXPECTED_GIT_BRANCH}`);
  }
  if (actualHost !== expectedHost) {
    throw new Error("DATABASE_URL no coincide con EXPECTED_DATABASE_HOST");
  }
  if (safetyTag !== EXPECTED_SAFETY_TAG) {
    throw new Error(`DATABASE_SAFETY_TAG debe ser ${EXPECTED_SAFETY_TAG}`);
  }

  return { branch, host: actualHost, safetyTag };
}

if (require.main === module) {
  const safe = assertSafeStagingEnvironment();
  console.log(`Guard OK: branch=${safe.branch}, host=${safe.host}, tag=${safe.safetyTag}`);
}
