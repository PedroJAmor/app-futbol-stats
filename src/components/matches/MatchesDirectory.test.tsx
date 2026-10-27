// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MatchesDirectory from "./MatchesDirectory";

const state = vi.hoisted(() => ({ role: "ADMIN", refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: state.role ? { user: { role: state.role } } : null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
vi.mock("./MatchEditor", () => ({ default: () => null }));
vi.mock("./MatchFilters", () => ({ default: ({ value, onChange }: any) => <button type="button" onClick={() => onChange({ ...value, format: "7" })}>Buscar formato</button> }));
const visible = { id: 1, playedAt: "2026-10-24T18:00:00Z", format: 7, venue: "Rebote", isHidden: false, teams: [] };
const hidden = { ...visible, id: 2, isHidden: true };
let host: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();
const response = (body: unknown, ok = true) => Promise.resolve({ ok, json: async () => body });
const button = (text: string) => [...host.querySelectorAll("button")].find(element => element.textContent === text)!;
function render() { act(() => root.render(<MatchesDirectory matches={[visible]} formats={[7]} venues={[]} players={[]} />)); }
async function showHidden() {
  await act(async () => { host.querySelector<HTMLInputElement>(".match-visibility-filter input")!.click(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  vi.clearAllMocks();
  state.role = "ADMIN";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("partidos ocultos", () => {
  it("consulta el servidor cuando el único filtro es el formato", async () => {
    fetchMock.mockImplementation(() => response([]));
    render();
    act(() => button("Buscar formato").click());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    const params = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost").searchParams;
    expect(params.get("format")).toBe("7");
    expect(params.get("includeHidden")).toBeNull();
    expect(host.textContent).toContain("No hay partidos para estos filtros.");
  });
  it("pide ocultos solo al activarlo y los ofrece sin enlace roto; al perder rol desaparecen", async () => {
    fetchMock.mockImplementation(() => response([visible, hidden]));
    render();
    expect(fetchMock).not.toHaveBeenCalled();
    await showHidden();
    expect(String(fetchMock.mock.calls[0][0])).toContain("includeHidden=1");
    expect(host.querySelector('a[href="/partidos/2"]')).toBeNull();
    expect(button("Restaurar partido")).toBeTruthy();
    state.role = "USER"; render();
    expect(host.textContent).not.toContain("Restaurar partido");
    expect(host.textContent).not.toContain("Oculto");
  });
  it("evita restauraciones duplicadas y conserva la opción tras un error de red", async () => {
    fetchMock.mockImplementation(() => response([visible, hidden]));
    render(); await showHidden();
    let reject!: (error: Error) => void;
    fetchMock.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    const restore = button("Restaurar partido");
    act(() => { restore.click(); restore.click(); });
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "PATCH")).toHaveLength(1);
    await act(async () => { reject(new Error("Sin conexión")); });
    expect(host.textContent).toContain("Sin conexión");
    expect(button("Restaurar partido").disabled).toBe(false);
    fetchMock.mockImplementationOnce(() => response({ ...hidden, isHidden: false }));
    await act(async () => { button("Restaurar partido").click(); });
    expect(state.refresh).toHaveBeenCalledOnce();
    expect(host.querySelector('a[href="/partidos/2"]')).not.toBeNull();
  });
});
