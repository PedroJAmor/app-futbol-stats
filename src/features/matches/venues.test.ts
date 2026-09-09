import { describe, expect, it } from "vitest";
import { cleanVenueName, normalizeVenueName } from "./venues";

describe("venue names", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanVenueName("  La   Avenida  ")).toBe("La Avenida");
  });

  it("normalizes case without changing accents", () => {
    expect(normalizeVenueName("FÚTBOL 5")).toBe("fútbol 5");
  });
});
