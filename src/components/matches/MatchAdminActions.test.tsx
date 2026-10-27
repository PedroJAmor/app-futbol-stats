// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MatchAdminActions from "./MatchAdminActions";
import type { EditableMatch } from "./MatchEditor";

const state = vi.hoisted(() => ({ role: "ADMIN", push: vi.fn(), refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { role: state.role } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push, refresh: state.refresh }) }));
vi.mock("./MatchEditor", () => ({ default: () => null }));
const match = { id: 25 } as EditableMatch;
let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
function buttons(text: string) { return [...host.querySelectorAll("button")].filter(button => button.textContent === text); }
function render() { act(() => root.render(<MatchAdminActions match={match} />)); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks(); state.role = "ADMIN"; fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
describe("borrado de partido", () => {
  it("no muestra acciones administrativas a USER", () => { state.role = "USER"; render(); expect(host.querySelector("button")).toBeNull(); });
  it("requiere confirmación, evita doble DELETE y permite reintentar sin abandonar la ficha", async () => {
    render();
    act(() => buttons("Borrar partido")[0].click());
    expect(fetchMock).not.toHaveBeenCalled();
    let finish!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const confirm = buttons("Borrar partido")[1];
    act(() => { confirm.click(); confirm.click(); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/partidos/25", { method: "DELETE" });
    await act(async () => { finish({ ok: false, json: async () => ({ error: "No tenés permiso" }) }); });
    expect(host.textContent).toContain("No tenés permiso");
    expect(state.push).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 25, isHidden: true }) });
    await act(async () => { buttons("Borrar partido")[1].click(); });
    expect(state.push).toHaveBeenCalledWith("/partidos");
    expect(state.refresh).toHaveBeenCalledOnce();
    expect(host.querySelector("dialog")).toBeNull();
  });
});
