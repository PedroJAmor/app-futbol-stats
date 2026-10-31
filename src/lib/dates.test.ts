import { describe, expect, it } from "vitest";
import { argentinaFormToUtc, formatArgentinaHomeDate, formatArgentinaDateTime, formatArgentinaMatchDate } from "./dates";

describe("Argentina timezone", () => {
  it("rechaza días inexistentes y horas fuera de rango", () => {
    for (const date of ["2026-02-30", "2026-02-29", "2026-04-31", "0000-01-01", "2026-13-01"]) {
      expect(() => argentinaFormToUtc(date, "21:00")).toThrow();
    }
    for (const time of ["24:00", "12:60", "9:00"]) expect(() => argentinaFormToUtc("2026-01-01", time)).toThrow();
    expect(argentinaFormToUtc("2028-02-29", "00:00").toISOString()).toBe("2028-02-29T03:00:00.000Z");
  });
  it("muestra día de semana y hora de Argentina, incluso al cambiar el día en UTC", () => {
    expect(formatArgentinaMatchDate("2026-10-24T18:00:00Z")).toBe("Sábado 24/10/2026 15:00");
    expect(formatArgentinaMatchDate("2026-10-25T01:00:00Z")).toBe("Sábado 24/10/2026 22:00");
  });
  it("convierte formulario local a UTC y vuelve a mostrar la hora esperada", () => {
    const utc = argentinaFormToUtc("2026-06-01", "21:30");
    expect(utc.toISOString()).toBe("2026-06-02T00:30:00.000Z");
    expect(formatArgentinaDateTime(utc)).toBe("01/06/2026 21:30");
  });
});

it("abrevia el día y conserva fecha sin hora según Argentina para Inicio", () => {
  expect(formatArgentinaHomeDate("2026-10-25T01:00:00Z")).toBe("Sa 24/10/2026");
  expect(formatArgentinaHomeDate("2026-10-26T18:00:00Z")).toBe("Lu 26/10/2026");
});
