import { expect, it } from "vitest";
import { assertPreviewDatabase } from "./previewDatabase";

const preview = { VERCEL_ENV: "preview", DATABASE_URL: "postgresql://user:password@test.example/db", EXPECTED_DATABASE_HOST: "test.example", DATABASE_SAFETY_TAG: "rebuild-v2/staging" };

it("acepta solo la base confirmada en Preview", () => {
  expect(() => assertPreviewDatabase(preview)).not.toThrow();
  expect(() => assertPreviewDatabase({ ...preview, DATABASE_URL: "postgres://user:password@test.example/db" })).not.toThrow();
});
it.each([
  { DATABASE_URL: "postgresql://user:password@production.example/db" },
  { DATABASE_URL: "postgresql://test.example:password@production.example/db" },
  { DATABASE_URL: "https://test.example/db" },
  { DATABASE_URL: "invalid-connection" },
  { EXPECTED_DATABASE_HOST: "" },
  { DATABASE_SAFETY_TAG: "" },
])("bloquea Preview antes de construir Prisma: %j", overrides => {
  expect(() => assertPreviewDatabase({ ...preview, ...overrides })).toThrow();
});
it("no cambia el comportamiento de los otros entornos", () => {
  expect(() => assertPreviewDatabase({ VERCEL_ENV: "production" })).not.toThrow();
  expect(() => assertPreviewDatabase({})).not.toThrow();
});
