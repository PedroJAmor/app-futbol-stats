import { describe, expect, it } from "vitest";
import { formatPlayerName, fullPlayerName, lineupPlayerName, splitLastName } from "./displayName";

describe("player display name", () => {
  it("muestra nombre, apodo y apellido cuando existen", () => {
    expect(formatPlayerName({ firstName: "Adriel", nickname: "Pingüino", lastName: "Cricrí" })).toBe('Adriel "Pingüino" Cricrí');
  });
  it("preserva el nombre legacy inicial sin inventar apellido", () => {
    expect(formatPlayerName({ firstName: "Pedro Javier Amor", lastName: null, legacyFullName: "Pedro Javier Amor" })).toBe("Pedro Javier Amor");
  });
  it("usa apodo o desambigua nombres repetidos con la inicial del apellido", () => {
    const repeated = new Set(["pedro"]);
    expect(lineupPlayerName({ firstName: "Pedro", lastName: "Amor", nickname: "Pepo" }, repeated)).toBe("Pepo");
    expect(lineupPlayerName({ firstName: "Pedro", lastName: "Amor" }, repeated)).toBe("Pedro A.");
    expect(lineupPlayerName({ firstName: "Pedro Javier Amor", legacyFullName: "Pedro Javier Amor" }, repeated)).toBe("Pedro");
    expect(lineupPlayerName({ firstName: "Leónidas", lastName: "Amor" }, repeated)).toBe("Leónidas");
  });
  it("arma el nombre completo sin incluir el apodo", () => {
    expect(fullPlayerName({ firstName: "Agustín", lastName: "Attianese", nickname: "Lulo" })).toBe("Agustín Attianese");
  });
  it("separa la última palabra como apellido para normalización", () => {
    expect(splitLastName("Pedro Javier Amor")).toEqual({ firstName: "Pedro Javier", lastName: "Amor" });
    expect(splitLastName("  Juan   Pérez ")).toEqual({ firstName: "Juan", lastName: "Pérez" });
    expect(splitLastName("Lulo")).toBeNull();
  });
});
