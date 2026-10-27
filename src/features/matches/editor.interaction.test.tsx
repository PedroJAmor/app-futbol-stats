// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MatchEditor, { type EditableMatch } from "@/components/matches/MatchEditor";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const players = [
  { id: 1, firstName: "Ana", lastName: null, nickname: null, legacyFullName: null, isActive: true, _count: { participations: 2 } },
  { id: 2, firstName: "Juan", lastName: null, nickname: null, legacyFullName: null, isActive: false, _count: { participations: 3 } },
];
const match: EditableMatch = { id: 10, date: "2026-10-24", time: "21:00", format: 7, venueId: "", price: "", weather: "Nublado", temperature: "", notes: "Conservar estas notas", mvpId: "2", aColor: "Claro", bColor: "Oscuro", result: "A", aPlayers: [1], bPlayers: [2] };
let root: Root;
let host: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
const onClose = vi.fn();
function response(data: unknown, ok = true) { return { ok, json: async () => data }; }
async function render() { await act(async () => root.render(<MatchEditor match={match} onClose={onClose} />)); }
function button(text: string) { return [...host.querySelectorAll("button")].find(node => node.textContent === text)!; }
async function submit() { await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  onClose.mockReset();
  refresh.mockReset();
  fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(response(url.startsWith("/api/jugadores") ? players : [])));
  vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("conserva inactivos seleccionados, permite mover MVP y envía clima", async () => {
  await render();
  expect(fetchMock.mock.calls[0][0]).toBe("/api/jugadores?sort=popular");
  expect(host.textContent).toContain("Juan (inactivo)");
  await act(async () => { host.querySelector<HTMLButtonElement>('[aria-label="Mover a Juan a Equipo A"]')!.click(); });
  fetchMock.mockResolvedValueOnce(response({ id: 10 }));
  // Move Ana to B so both teams remain valid, preserving the selected MVP.
  await act(async () => { host.querySelector<HTMLButtonElement>('[aria-label="Mover a Ana a Equipo B"]')!.click(); });
  await submit();
  const payload = JSON.parse(fetchMock.mock.calls[2][1].body);
  expect(payload.teams[0].playerIds).toEqual([2]);
  expect(payload.teams[1].playerIds).toEqual([1]);
  expect(payload.mvpId).toBe(2);
  expect(payload.weather).toBe("Nublado");
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("conserva formulario tras error de red, evita envío duplicado y cierre al guardar", async () => {
  await render();
  let reject!: (error: Error) => void;
  fetchMock.mockImplementationOnce(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
  await submit();
  await submit();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(button("Cerrar").disabled).toBe(true);
  await act(async () => { reject(new TypeError("Failed to fetch")); });
  expect(host.querySelector("textarea")!.value).toBe(match.notes);
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  expect(button("Guardar partido").disabled).toBe(false);
  expect(onClose).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(response({ id: 10 }));
  await submit();
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("permite reintentar opciones si la API rechaza la carga y bloquea guardado incompleto", async () => {
  fetchMock.mockResolvedValueOnce(response({ error: "falló" }, false));
  await render();
  expect(button("Guardar partido").disabled).toBe(true);
  expect(host.querySelector('[role="alert"]')!.textContent).toContain("No se pudieron cargar");
  await act(async () => { button("Reintentar").click(); });
  expect(button("Guardar partido").disabled).toBe(false);
  expect(host.textContent).toContain("Juan (inactivo)");
});

it("retiene foco en el diálogo, admite Escape y restaura foco y scroll al cerrar", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  document.body.style.overflow = "auto";
  opener.focus();
  await render();
  const close = button("Cerrar");
  const save = button("Guardar partido");
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(close);
  act(() => close.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(save);
  act(() => save.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(close);
  act(() => close.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => root.render(null));
  expect(document.body.style.overflow).toBe("auto");
  expect(document.activeElement).toBe(opener);
  opener.remove();
  document.body.style.overflow = "";
});

it("Escape y backdrop no cierran el formulario mientras se guarda", async () => {
  await render();
  let resolve!: (value: ReturnType<typeof response>) => void;
  fetchMock.mockImplementationOnce(() => new Promise(resolvePromise => { resolve = resolvePromise; }));
  await submit();
  const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
  act(() => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
  act(() => host.querySelector<HTMLElement>(".modal-backdrop")!.click());
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { resolve(response({ id: 10 })); });
  expect(onClose).toHaveBeenCalledTimes(1);
});
