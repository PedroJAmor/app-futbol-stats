import { describe, expect, it } from "vitest";
import { argentinaFormToUtc, formatArgentinaDateTime } from "./dates";

describe("Argentina timezone", () => {
  it("convierte formulario local a UTC y vuelve a mostrar la hora esperada", () => {
    const utc = argentinaFormToUtc("2026-06-01", "21:30");
    expect(utc.toISOString()).toBe("2026-06-02T00:30:00.000Z");
    expect(formatArgentinaDateTime(utc)).toBe("01/06/2026 21:30");
  });
});
