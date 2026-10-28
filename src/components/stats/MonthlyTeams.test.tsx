// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MonthlyTeams from "./MonthlyTeams";
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
let host: HTMLDivElement, root: Root;
const fetchMock = vi.fn();
const result = { month: "2026-09", months: ["2026-09", "2026-05"], candidateCount: 0, best: [], worst: [] };
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  fetchMock.mockReset().mockResolvedValue(response(result)); vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it("muestra el mes calendario anterior vacío y conserva el archivo de meses del servidor", async () => {
  await act(async () => root.render(<MonthlyTeams />));
  const select = host.querySelector("select")!;
  expect(select.value).toBe("2026-09");
  expect([...select.options].map(option => option.value)).toEqual(["2026-09", "2026-05"]);
  expect(host.textContent).toContain("No hay partidos registrados en septiembre de 2026");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("cancela consultas obsoletas al elegir otro mes sin permitir que reemplacen la selección", async () => {
  await act(async () => root.render(<MonthlyTeams />));
  let finish!: (value: unknown) => void; let signal!: AbortSignal;
  fetchMock.mockImplementationOnce((_url: string, options: { signal: AbortSignal }) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); });
  const select = host.querySelector("select")!;
  act(() => { select.value = "2026-05"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.textContent).toContain("Cargando equipos del mes");
  fetchMock.mockResolvedValue(response(result));
  await act(async () => { select.value = "2026-09"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(signal.aborted).toBe(true);
  await act(async () => finish(response({ ...result, month: "2026-05" })));
  expect(host.textContent).toContain("septiembre de 2026");
  expect(select.value).toBe("2026-09");
});
it("un fallo permite reintentar el mismo mes sin confundirlo con un mes vacío", async () => {
  fetchMock.mockResolvedValueOnce(response({ error: "Temporalmente no disponible" }, false));
  await act(async () => root.render(<MonthlyTeams />));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Temporalmente no disponible");
  expect(host.textContent).not.toContain("No hay partidos registrados");
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  expect(host.textContent).toContain("septiembre de 2026");
});
