// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PlayerEditor from "./PlayerEditor";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
let root: Root;
let host: HTMLDivElement;
let close: ReturnType<typeof vi.fn<() => void>>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host); close = vi.fn(); refresh.mockReset();
  act(() => root.render(<PlayerEditor player={{ id: 7, firstName: "Mimi", lastName: null, nickname: null, isActive: false }} onClose={close} />));
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it("conserva actividad y datos ante error de red y permite reintentar", async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 7 }) });
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Sin conexión");
  expect((host.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);
  expect(close).not.toHaveBeenCalled();
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ firstName: "Mimi", isActive: false });
  expect(close).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce();
});
it("evita envíos repetidos y cerrar mientras guarda", async () => {
  let finish!: (value: unknown) => void;
  const fetcher = vi.fn(() => new Promise(resolve => { finish = resolve; })); vi.stubGlobal("fetch", fetcher);
  act(() => { const form = host.querySelector("form")!; form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(fetcher).toHaveBeenCalledOnce();
  act(() => { host.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
  expect(close).not.toHaveBeenCalled();
  await act(async () => { finish({ ok: true, json: async () => ({ id: 7 }) }); });
  expect(close).toHaveBeenCalledOnce();
});
