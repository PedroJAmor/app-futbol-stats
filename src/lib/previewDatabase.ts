type Environment = Readonly<Record<string, string | undefined>>;

// Preview must fail closed rather than inherit a production database URL.
// This runs before Prisma is constructed, at build time and in server functions.
export function assertPreviewDatabase(environment: Environment = process.env) {
  if (environment.VERCEL_ENV !== "preview") return;
  const expectedHost = environment.EXPECTED_DATABASE_HOST;
  if (!expectedHost || environment.DATABASE_SAFETY_TAG !== "rebuild-v2/staging") {
    throw new Error("Preview requiere la identificación de la base de pruebas confirmada.");
  }
  let url: URL;
  try { url = new URL(environment.DATABASE_URL ?? ""); }
  catch { throw new Error("La conexión de Preview no es válida."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== expectedHost) {
    throw new Error("Preview detenido: la conexión no corresponde a la base de pruebas confirmada.");
  }
}
