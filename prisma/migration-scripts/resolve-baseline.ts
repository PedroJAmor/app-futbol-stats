import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { assertSafeStagingEnvironment } from "./guard-env";

assertSafeStagingEnvironment();

const prismaBin = resolve("node_modules/.bin/prisma");
execFileSync(prismaBin, ["migrate", "resolve", "--applied", "0000_v1_baseline"], {
  stdio: "inherit",
  env: process.env,
});
