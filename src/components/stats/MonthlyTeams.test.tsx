// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MonthlyTeams from "./MonthlyTeams";
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
let host: HTMLDivElement, root: Root;
const fetchMock = vi.fn();
const result = { month: "2026-09", months: ["2026-09", "2026-05", "2026-04"], candidateCount: 0, best: [], worst: [] };
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
function detail(month: string) {
  return [...host.querySelectorAll('details')].find(item => item.querySelector('summary')?.textContent?.includes(month))!;
}
async function toggle(month: string, open: boolean) {
  await act(async () => { const item = detail(month); item.open = open; item.dispatchEvent(new Event('toggle')); });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  fetchMock.mockReset().mockImplementation(async (url: string) => response({ ...result, month: new URL(url, 'http://localhost').searchParams.get('month') || result.month }));
  vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it("mantiene el último mes y todos los anteriores sin cargarlos hasta desplegarlos", async () => {
  await act(async () => root.render(<MonthlyTeams />));
  expect(host.textContent).toContain("No hay partidos registrados en septiembre de 2026");
  expect(detail('mayo de 2026').open).toBe(false);
  expect(detail('abril de 2026').open).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(host.querySelectorAll('select, input[type=checkbox]')).toHaveLength(0);
  expect(fetchMock.mock.calls[0][0]).not.toContain('categories=');
});
it("abre varios meses sin desaparecer los demás ni navegar y reutiliza los resultados al reabrir", async () => {
  await act(async () => root.render(<MonthlyTeams />));
  await toggle('mayo de 2026', true);
  await toggle('abril de 2026', true);
  expect(host.querySelectorAll('details')).toHaveLength(2);
  expect(detail('mayo de 2026').open).toBe(true);
  expect(detail('abril de 2026').open).toBe(true);
  expect(detail('mayo de 2026').textContent).toContain('No hay partidos registrados en mayo de 2026');
  expect(detail('abril de 2026').textContent).toContain('No hay partidos registrados en abril de 2026');
  expect(host.querySelector('.monthly-archive a')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await toggle('mayo de 2026', false);
  await toggle('mayo de 2026', true);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("un error de un mes permite reintentar sin ocultar el archivo ni el otro mes", async () => {
  await act(async () => root.render(<MonthlyTeams />));
  fetchMock.mockResolvedValueOnce(response({ error: 'Temporalmente no disponible' }, false));
  await toggle('mayo de 2026', true);
  expect(detail('mayo de 2026').querySelector('[role=alert]')?.textContent).toContain('Temporalmente no disponible');
  await toggle('abril de 2026', true);
  expect(detail('abril de 2026').textContent).toContain('No hay partidos registrados en abril de 2026');
  await act(async () => detail('mayo de 2026').querySelector<HTMLButtonElement>('button')!.click());
  expect(detail('mayo de 2026').textContent).toContain('No hay partidos registrados en mayo de 2026');
});
it("conserva enlaces anteriores abriendo ese mes sin sustituir el último ni quitar los otros", async () => {
  await act(async () => root.render(<MonthlyTeams month="2026-05" />));
  expect(host.querySelector('h2')?.textContent).toBe('septiembre de 2026');
  expect(detail('mayo de 2026').open).toBe(true);
  expect(detail('abril de 2026').open).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("cancela la carga al salir de la página", async () => {
  let signal!: AbortSignal;
  fetchMock.mockImplementationOnce((_url: string, options: { signal: AbortSignal }) => { signal = options.signal; return new Promise(() => {}); });
  await act(async () => root.render(<MonthlyTeams />));
  act(() => root.render(null));
  expect(signal.aborted).toBe(true);
});
