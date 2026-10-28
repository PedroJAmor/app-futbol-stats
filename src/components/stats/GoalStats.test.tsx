// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import GoalStats from "./GoalStats";
let host: HTMLDivElement, root: Root;
const fetchMock = vi.fn();
const data = { venues: [{ id: 1, name: "Rebote", pendingMatches: 1, unassignedMatches: 1, courts: [{ id: 2, name: "F7", goals: [{ id: 10, name: "Estacionamiento", position: 0 }, { id: 11, name: "Pared", position: 1 }], matches: 10, pendingMatches: 0, demoMatches: 3, counts: [5, 1, 4], percentages: [50, 10, 40] }] }] };
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => data }); vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function open() {
  await act(async () => { const details = host.querySelector("details")!; details.open = true; details.dispatchEvent(new Event("toggle")); });
}
it("no añade una petición al abrir la página; carga al desplegar el apartado", async () => {
  await act(async () => root.render(<GoalStats venueId={1} courtId={2} />));
  expect(fetchMock).not.toHaveBeenCalled();
  await open();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toContain("venueId=1&courtId=2");
  expect(host.textContent).toContain("50%"); expect(host.textContent).toContain("10%"); expect(host.textContent).toContain("40%");
  expect(host.textContent).toContain("10 partidos analizados");
  expect(host.textContent).toContain("3 asignaciones de prueba");
  expect(host.textContent).toContain("1 sin cancha especificada");
});
it("distingue fallo del estado sin datos y permite reintentar", async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Sin conexión" }) });
  await act(async () => root.render(<GoalStats />)); await open();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Sin conexión");
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ venues: [] }) });
  const retry = [...host.querySelectorAll('button')].find(button => button.textContent === "Reintentar estadísticas por arco")!;
  await act(async () => retry.click());
  expect(host.textContent).toContain("No hay predios para estos filtros");
});
