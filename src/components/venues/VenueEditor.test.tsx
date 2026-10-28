// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import VenueEditor from "./VenueEditor";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
let root: Root, host: HTMLDivElement;
const fetchMock = vi.fn(), close = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
function fillName(value: string) {
  act(() => { const input = host.querySelector<HTMLInputElement>('input[required]')!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
}
async function submit() { await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }
it("permite crear un predio solo con nombre", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
  await act(async () => root.render(<VenueEditor onClose={close} />)); fillName("Rebote"); await submit();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe("/api/canchas");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: "Rebote" });
  expect(close).toHaveBeenCalledOnce(); expect(mocks.refresh).toHaveBeenCalledOnce();
});
it("conserva el formulario al fallar y admite reintento de una cancha sin formato ni arcos", async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Volvé a intentar" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2 }) });
  await act(async () => root.render(<VenueEditor venueId={1} courtMode onClose={close} />)); fillName("Cancha 1"); await submit();
  expect(host.querySelector<HTMLInputElement>('input[required]')!.value).toBe("Cancha 1"); expect(host.textContent).toContain("Volvé a intentar"); expect(close).not.toHaveBeenCalled();
  await submit();
  expect(fetchMock.mock.calls[1][0]).toBe("/api/canchas/1/pistas");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ name: "Cancha 1", format: null, photoUrl: "" });
  expect(close).toHaveBeenCalledOnce();
});
