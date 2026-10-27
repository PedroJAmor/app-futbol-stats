// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminPage from "./page";
const mocks = vi.hoisted(() => ({ session: { data: { user: { role: "SUPERADMIN" } }, status: "authenticated" }, push: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.session }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
const users = [{ id: "a", email: "a@example.test", name: "A", role: "USER", playerId: null }, { id: "b", email: "b@example.test", name: "B", role: "USER", playerId: null }];
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
let root: Root;
let host: HTMLDivElement;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function render() { await act(async () => { root.render(<AdminPage />); }); }
it("sale de carga tras error de red y permite reintentar", async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response(users)).mockResolvedValueOnce(response([])); vi.stubGlobal("fetch", fetcher);
  await render(); expect(host.textContent).not.toContain("Cargando cuentas"); expect(host.querySelector('[role="alert"]')?.textContent).toContain("No se pudieron cargar");
  await act(async () => { host.querySelector("button")!.click(); });
  expect(host.querySelectorAll("article")).toHaveLength(2); expect(host.querySelector('[role="alert"]')).toBeNull();
});
it("recupera controles y conserva valores ante error de guardado", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response(users)).mockResolvedValueOnce(response([])).mockRejectedValueOnce(new Error("offline")); vi.stubGlobal("fetch", fetcher); await render();
  const select = host.querySelector("select")!;
  await act(async () => { select.value = "ADMIN"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.textContent).not.toContain("Guardando"); expect(host.querySelector('[role="alert"]')?.textContent).toContain("No se pudo actualizar");
  expect(Array.from(host.querySelectorAll("select")).every(item => !item.disabled)).toBe(true); expect(select.value).toBe("USER");
});
it("bloquea controles de todas las cuentas y evita envíos repetidos", async () => {
  let finish!: (value: unknown) => void;
  const fetcher = vi.fn().mockResolvedValueOnce(response(users)).mockResolvedValueOnce(response([])).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(response(users)).mockResolvedValueOnce(response([])); vi.stubGlobal("fetch", fetcher); await render();
  act(() => { const selects = host.querySelectorAll("select"); selects[0].value = "ADMIN"; selects[0].dispatchEvent(new Event("change", { bubbles: true })); selects[2].value = "ADMIN"; selects[2].dispatchEvent(new Event("change", { bubbles: true })); });
  expect(fetcher.mock.calls.filter(call => call[1]?.method === "PATCH")).toHaveLength(1); expect(Array.from(host.querySelectorAll("select")).every(item => item.disabled)).toBe(true);
  await act(async () => { finish(response({ id: "a" })); });
  expect(Array.from(host.querySelectorAll("select")).every(item => !item.disabled)).toBe(true);
});
it("aborta cargas al desmontar sin aplicar respuestas obsoletas", async () => {
  const signals: AbortSignal[] = [];
  vi.stubGlobal("fetch", vi.fn((_url, options) => { signals.push(options.signal); return new Promise(() => {}); }));
  await render(); act(() => root.render(null)); expect(signals.every(signal => signal.aborted)).toBe(true);
});
