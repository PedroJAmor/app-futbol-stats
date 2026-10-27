// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StatsPage from "./page";
import { calculateGroupStats, calculateStats, type RawStat } from "@/lib/stats";

vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
const player = (id: number) => ({ id, firstName: id === 1 ? "Mimi" : "Nagu", nickname: null, lastName: null, legacyFullName: null, photoUrl: null });
const rows: RawStat[] = [1, 2].flatMap(id => [
  { player: player(id), team: { id: 10, result: "WIN", match: { id: 5, format: 7, playedAt: new Date("2026-10-24T18:00:00Z"), isHidden: false } } },
  { player: player(id), team: { id: 12, result: "LOSS", match: { id: 6, format: 7, playedAt: new Date("2026-10-25T18:00:00Z"), isHidden: false } } },
]);
const stats = calculateStats(rows);
const group = calculateGroupStats([1, 2], rows);
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
let host: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();
const button = (text: string) => [...host.querySelectorAll("button")].find(element => element.textContent === text)!;
const render = async () => { await act(async () => root.render(<StatsPage />)); };
function changeFormat(value: string) {
  act(() => Simulate.change(host.querySelector<HTMLInputElement>('input[type="number"]')!, { target: { value } } as any));
}
async function selectPlayers() {
  act(() => button("⌕Buscar y agregar jugador").click());
  for (let index = 0; index < 2; index++) {
    act(() => host.querySelector<HTMLButtonElement>(".player-option")!.click());
  }
  act(() => button("Cerrar").click());
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("scrollTo", vi.fn());
  HTMLElement.prototype.scrollIntoView = vi.fn();
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve(response({ stats })));
  vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe("carga de estadísticas", () => {
  it("permite elegir varios jugadores sin cerrar y devuelve el foco sin desplazar al buscador", async () => {
    await render();
    const trigger = button("⌕Buscar y agregar jugador");
    act(() => trigger.click());
    expect(document.body.style.position).toBe("fixed");
    act(() => host.querySelector<HTMLButtonElement>(".player-option")!.click());
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => host.querySelector<HTMLButtonElement>(".player-option")!.click());
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    const sheet = host.querySelector('[role="dialog"]')!;
    expect(sheet.querySelectorAll(".selected-player")).toHaveLength(2);
    expect(sheet.querySelector('[role="status"]')?.textContent).toBe("2 jugadores seleccionados");
    act(() => sheet.querySelector<HTMLButtonElement>(".selected-player")!.click());
    expect(sheet.querySelectorAll(".selected-player")).toHaveLength(1);
    expect(sheet.querySelector('[role="status"]')?.textContent).toBe("1 jugador seleccionado");
    act(() => host.querySelector<HTMLButtonElement>(".player-option")!.click());
    act(() => button("Cerrar").click());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelectorAll(".selected-list button")).toHaveLength(2);
    expect(document.body.style.position).toBe("");
    expect(document.activeElement).toBe(trigger);
    expect(button("Comparar jugadores").scrollIntoView).toHaveBeenCalled();
  });

  it("distingue error del estado vacío y reintenta sin perder los jugadores", async () => {
    fetchMock.mockImplementation((url: string) => Promise.resolve(url === "/api/stats?" ? response({ error: "No se pudo consultar" }, false) : response({ stats })));
    await render();
    expect(host.textContent).toContain("No se pudo consultar");
    expect(host.textContent).not.toContain("No hay resultados para estos filtros.");
    fetchMock.mockImplementation(() => Promise.resolve(response({ stats })));
    await act(async () => { button("Reintentar estadísticas").click(); });
    expect(host.querySelector(".stats-ranking")?.textContent).toContain("Mimi");
    await selectPlayers();
    expect(host.querySelectorAll(".selected-list button")).toHaveLength(2);
  });

  it("una respuesta de filtros anteriores no reemplaza la tabla actual", async () => {
    let finish!: (value: unknown) => void;
    let oldSignal!: AbortSignal;
    fetchMock.mockImplementation((url: string, options: { signal: AbortSignal }) => {
      if (url === "/api/stats?") { oldSignal = options.signal; return new Promise(resolve => { finish = resolve; }); }
      return Promise.resolve(response({ stats: url === "/api/stats" ? stats : [stats[1]] }));
    });
    await render();
    await act(async () => changeFormat("7"));
    expect(oldSignal.aborted).toBe(true);
    expect(host.querySelector(".stats-ranking")?.textContent).toContain("Nagu");
    await act(async () => { finish(response({ stats: [stats[0]] })); });
    expect(host.querySelector(".stats-ranking")?.textContent).not.toContain("Mimi");
    expect(host.querySelector(".stats-ranking")?.textContent).toContain("Nagu");
  });

  it("libera el guardado al fallar comparación, conserva selección y cancela cálculos obsoletos", async () => {
    await render(); await selectPlayers();
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("Sin conexión")));
    await act(async () => { button("Comparar jugadores").click(); });
    expect(host.textContent).toContain("Sin conexión");
    expect(host.querySelectorAll(".selected-list button")).toHaveLength(2);
    let finish!: (value: unknown) => void;
    let oldSignal!: AbortSignal;
    fetchMock.mockImplementationOnce((_url: string, options: { signal: AbortSignal }) => { oldSignal = options.signal; return new Promise(resolve => { finish = resolve; }); });
    act(() => button("Reintentar comparación").click());
    expect(host.textContent).toContain("Calculando...");
    await act(async () => changeFormat("7"));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => { finish(response(group)); });
    expect(host.textContent).not.toContain("Cuando jugaron juntos");
    expect(host.textContent).not.toContain("Calculando...");
    expect(host.querySelectorAll(".selected-list button")).toHaveLength(2);
  });
});
