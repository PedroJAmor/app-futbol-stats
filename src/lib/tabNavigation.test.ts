import { describe, expect, it } from "vitest";
import { getPrimaryTabIndex, getSwipeDestination, primaryTabs } from "./tabNavigation";

describe("primary tab swipe navigation", () => {
  it("uses the requested section order for tabs and gestures", () => {
    expect(primaryTabs.map(tab => tab.href)).toEqual(["/", "/partidos", "/jugadores", "/estadisticas", "/foro"]);
  });
  it("recognizes root and detail routes", () => {
    expect(getPrimaryTabIndex("/")).toBe(0);
    expect(getPrimaryTabIndex("/jugadores/12")).toBe(2);
    expect(getPrimaryTabIndex("/partidos/56")).toBe(1);
  });

  it("moves left to the next tab and right to the previous one", () => {
    expect(getSwipeDestination("/jugadores/12", -90, 12)).toBe("/estadisticas");
    expect(getSwipeDestination("/foro", 90, 8)).toBe("/estadisticas");
  });

  it("ignores short, vertical and out-of-range gestures", () => {
    expect(getSwipeDestination("/partidos", -40, 2)).toBeNull();
    expect(getSwipeDestination("/partidos", -80, 100)).toBeNull();
    expect(getSwipeDestination("/", 90, 0)).toBeNull();
    expect(getSwipeDestination("/foro", -90, 0)).toBeNull();
    expect(getSwipeDestination("/perfil", -90, 0)).toBeNull();
  });
});
