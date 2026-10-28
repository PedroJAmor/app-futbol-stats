import { PrismaClient } from "@prisma/client";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { assertSafeStagingEnvironment } from "./guard-env";

async function main() {
  const safe = assertSafeStagingEnvironment();
  if (safe.host !== "ep-flat-dew-ac0jqcc0-pooler.sa-east-1.aws.neon.tech") throw new Error("Host de pruebas no confirmado");
  const db = new PrismaClient();
  const name = "0003_match_categories_courts";
  const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  try {
    const migrations = await db.$queryRaw<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null;checksum:string}[]>`SELECT migration_name, finished_at, rolled_back_at, checksum FROM "_prisma_migrations" ORDER BY started_at`;
    if (migrations.some(m => !m.finished_at && !m.rolled_back_at)) throw new Error("Hay una migración previa sin terminar");
    if (!migrations.some(m => m.migration_name === "0002_match_venues" && m.finished_at)) throw new Error("Falta la base V2 con predios; no se ejecutarán migraciones históricas");
    const applied = migrations.find(m => m.migration_name === name && m.finished_at && !m.rolled_back_at);
    if (applied) {
      if (applied.checksum !== checksum) throw new Error("La migración aplicada difiere del archivo local");
      console.log("La migración nueva ya está aplicada y coincide."); return;
    }
    const columns = await db.$queryRaw<{column_name:string}[]>`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Match' AND column_name IN ('category','courtId','locationIsDemo')`;
    if (columns.length) throw new Error("Hay campos nuevos sin historial de migración; revisar antes de continuar");
    console.log(JSON.stringify({ migration: name, statements: sql.split(";").filter(x => x.trim()).length, previousApplied: migrations.filter(m=>m.finished_at&&!m.rolled_back_at).map(m=>m.migration_name), mode:process.argv.includes("--apply")?"apply":"dry-run" }));
    if (!process.argv.includes("--apply")) return;
    mkdirSync(".local-artifacts/friends-feedback", {recursive:true});
    writeFileSync(".local-artifacts/friends-feedback/migration-before.json", JSON.stringify({at:new Date(),migration:name,checksum,previous:migrations.map(m=>({name:m.migration_name,finished:!!m.finished_at,rolledBack:!!m.rolled_back_at}))},null,2));
    // Only this reviewed additive SQL; atomically record its standard Prisma
    // checksum/history with the DDL. No deploy command or historical SQL runs.
    await db.$transaction(async tx => {
      for (const statement of sql.split(";").map(x=>x.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,logs,rolled_back_at,started_at,applied_steps_count) VALUES (${randomUUID()},${checksum},${name},now(),NULL,NULL,now(),1)`;
    }, {timeout:30000});
    console.log("Migración aditiva nueva aplicada; historial registrado en la misma transacción.");
  } finally { await db.$disconnect(); }
}
main().catch(e=>{ console.error(e.message);process.exitCode=1; });
