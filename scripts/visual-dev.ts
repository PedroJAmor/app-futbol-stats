import { spawn } from "node:child_process";
import { assertSafeStagingEnvironment } from "../prisma/migration-scripts/guard-env";

// Validate before starting Next, then inherit exactly the validated environment.
assertSafeStagingEnvironment();
const mode = process.argv.includes("--production") ? "start" : "dev";
console.log(`Entorno de pruebas validado. Iniciando ${mode === "start" ? "vista compilada" : "revisión visual"} local en el puerto 3000.`);

const server = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"),
  mode, "--hostname", "0.0.0.0", "--port", "3000",
], { stdio: "inherit", env: process.env });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { server.kill(signal); });
}

server.once("error", () => {
  console.error("No se pudo iniciar el servidor de revisión visual.");
  process.exitCode = 1;
});
server.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
