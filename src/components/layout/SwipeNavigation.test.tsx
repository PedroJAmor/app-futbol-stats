// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SwipeNavigation from "./SwipeNavigation";

const navigation = vi.hoisted(() => ({ pathname: "/partidos", push: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, prefetch: navigation.prefetch }),
}));

let root: Root;
let host: HTMLDivElement;
let target: HTMLElement;
let reducedMotion = false;
const main = () => host.querySelector("main")!;
function render() {
  act(() => root.render(<SwipeNavigation><a href="#player">Jugador</a><input /><details><summary>Filtros</summary></details><div role="dialog"><a href="/perfil">Perfil</a></div><div className="table-scroll"><table><tbody><tr><td>Estadísticas</td></tr></tbody></table></div></SwipeNavigation>));
  target = host.querySelector("a")!;
}
function advance(ms: number) { act(() => vi.advanceTimersByTime(ms)); }
function touch(type: string, x: number, y = 100, options: { target?: Element; count?: number; identifier?: number } = {}) {
  const point = { clientX: x, clientY: y, identifier: options.identifier ?? 1 };
  const ending = type === "touchend" || type === "touchcancel";
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    touches: { value: ending ? [] : Array.from({ length: options.count ?? 1 }, (_, index) => ({ ...point, identifier: point.identifier + index })) },
    changedTouches: { value: [point] },
  });
  act(() => { (options.target ?? target).dispatchEvent(event); });
  return event;
}
function click() {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  act(() => target.dispatchEvent(event));
  return event;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  reducedMotion = false;
  vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  navigation.pathname = "/partidos";
  navigation.push.mockReset();
  navigation.prefetch.mockReset();
  Object.defineProperty(navigator, "connection", { configurable: true, value: undefined });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  render();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("section touch navigation", () => {
  it("follows the finger and navigates immediately while returning the old page to view", () => {
    touch("touchstart", 250);
    expect(touch("touchmove", 100).defaultPrevented).toBe(true);
    expect(main().style.transform).toBe("translate3d(-150px, 0, 0)");
    expect(main().style.transition).toBe("none");
    expect(navigation.push).not.toHaveBeenCalled();
    touch("touchend", 100);
    expect(main().style.transform).toBe("translate3d(0px, 0, 0)");
    expect(navigation.push).toHaveBeenCalledTimes(1);
    advance(180);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("/jugadores");
    touch("touchend", 100);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(click().defaultPrevented).toBe(true);
  });

  it("slides the destination in, then removes transforms so fixed dialogs keep viewport positioning", () => {
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    advance(180);
    navigation.pathname = "/jugadores";
    render();
    expect(main().style.transform).toBe(`translate3d(${Math.min(96, window.innerWidth * .25)}px, 0, 0)`);
    advance(16);
    expect(main().style.transform).toBe("translate3d(0px, 0, 0)");
    advance(180);
    expect(main().style.transform).toBe("");
    expect(main().style.willChange).toBe("");
    expect(main().style.pointerEvents).toBe("");
  });

  it("goes to the preceding section on a right swipe", () => {
    touch("touchstart", 40);
    touch("touchmove", 160);
    expect(main().style.transform).toBe("translate3d(120px, 0, 0)");
    touch("touchend", 160);
    advance(180);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("/");
  });

  it.each(["input", "summary", "td", "[role=dialog] a"])("preserves native interaction with %s", (selector) => {
    const element = host.querySelector(selector)!;
    touch("touchstart", 250, 100, { target: element });
    expect(touch("touchmove", 100, 100, { target: element }).defaultPrevented).toBe(false);
    touch("touchend", 100, 100, { target: element });
    advance(200);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(main().style.transform).toBe("");
  });

  it("preserves vertical scrolling even if the finger later moves sideways", () => {
    touch("touchstart", 250);
    expect(touch("touchmove", 245, 180).defaultPrevented).toBe(false);
    touch("touchend", 100, 180);
    advance(200);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(main().style.transform).toBe("");
  });

  it("snaps back and suppresses the accidental link click after a short drag", () => {
    touch("touchstart", 250);
    touch("touchmove", 220);
    expect(main().style.transform).toBe("translate3d(-30px, 0, 0)");
    touch("touchend", 220);
    expect(main().style.transform).toBe("translate3d(0px, 0, 0)");
    expect(click().defaultPrevented).toBe(true);
    advance(350);
    expect(main().style.transform).toBe("");
    expect(click().defaultPrevented).toBe(false);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("resists the edge of the first section and never wraps to another section", () => {
    navigation.pathname = "/";
    render();
    touch("touchstart", 40);
    touch("touchmove", 240);
    expect(main().style.transform).toBe("translate3d(44px, 0, 0)");
    touch("touchend", 240);
    advance(180);
    expect(main().style.transform).toBe("");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("cancels interrupted gestures, multitouch and a different finger", () => {
    for (const mode of ["cancel", "multitouch", "second-touchstart", "different-finger"] as const) {
      touch("touchstart", 250);
      touch("touchmove", 100);
      if (mode === "cancel") touch("touchcancel", 100);
      if (mode === "multitouch") touch("touchmove", 100, 100, { count: 2 });
      if (mode === "second-touchstart") touch("touchstart", 100, 100, { count: 2 });
      if (mode === "different-finger") touch("touchmove", 100, 100, { identifier: 2 });
      touch("touchend", 100);
      advance(350);
      expect(navigation.push).not.toHaveBeenCalled();
      expect(main().style.transform).toBe("");
      expect(click().defaultPrevented).toBe(false);
    }
  });

  it("keeps content visible and prevents duplicate navigation even when the route is very slow", () => {
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    expect(main().style.transform).toBe("translate3d(0px, 0, 0)");
    advance(180);
    expect(main().style.transform).toBe("");
    advance(5000);
    expect(main().style.transform).toBe("");
    expect(main().style.pointerEvents).toBe("");
    touch("touchstart", 250);
    touch("touchend", 100);
    advance(180);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    navigation.pathname = "/jugadores";
    render();
    advance(200);
    expect(main().style.transform).toBe("");
  });

  it("allows retry after a navigation stays unresolved for ten seconds", () => {
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    advance(9999);
    touch("touchstart", 250);
    touch("touchend", 100);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(main().style.transform).toBe("");
    advance(1);
    expect(main().style.pointerEvents).toBe("");
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    expect(navigation.push).toHaveBeenCalledTimes(2);
    expect(navigation.push).toHaveBeenLastCalledWith("/jugadores");
  });

  it("cleans pending animation if the user navigates elsewhere", () => {
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    navigation.pathname = "/perfil";
    render();
    advance(2000);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(main().style.transform).toBe("");
  });

  it("respects reduced motion while retaining section navigation", () => {
    reducedMotion = true;
    touch("touchstart", 250);
    touch("touchmove", 100);
    expect(main().style.transform).toBe("");
    touch("touchend", 100);
    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("/jugadores");
    navigation.pathname = "/jugadores";
    render();
    expect(main().style.transform).toBe("");
  });


  it("keeps taps and non-section pages unchanged", () => {
    touch("touchstart", 100);
    touch("touchend", 102);
    expect(click().defaultPrevented).toBe(false);
    navigation.pathname = "/perfil";
    render();
    touch("touchstart", 250);
    expect(touch("touchmove", 100).defaultPrevented).toBe(false);
    touch("touchend", 100);
    advance(200);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(main().style.transform).toBe("");
  });

  it("restores the page if the router rejects navigation synchronously", () => {
    navigation.push.mockImplementationOnce(() => { throw new Error("Navigation failed"); });
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    advance(360);
    expect(main().style.transform).toBe("");
    expect(main().style.pointerEvents).toBe("");
  });

  it("prefetches only the intended neighbor once across repeated gestures", () => {
    expect(navigation.prefetch).not.toHaveBeenCalled();
    touch("touchstart", 250);
    touch("touchmove", 220);
    touch("touchmove", 215);
    touch("touchend", 220);
    advance(180);
    touch("touchstart", 250);
    touch("touchmove", 220);
    touch("touchend", 220);
    expect(navigation.prefetch).toHaveBeenCalledTimes(1);
    expect(navigation.prefetch).toHaveBeenCalledWith("/jugadores");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("skips speculative prefetch when data saver is enabled", () => {
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } });
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    expect(navigation.prefetch).not.toHaveBeenCalled();
    expect(navigation.push).toHaveBeenCalledWith("/jugadores");
  });

  it("does not repeat navigation after unmount", () => {
    touch("touchstart", 250);
    touch("touchmove", 100);
    touch("touchend", 100);
    act(() => root.render(null));
    advance(2000);
    expect(navigation.push).toHaveBeenCalledTimes(1);
  });
});
