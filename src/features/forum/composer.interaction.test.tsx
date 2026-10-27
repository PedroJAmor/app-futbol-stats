// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ForumPage from "@/app/foro/page";
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { role: "ADMIN" } } }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
let root: Root;
let host: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
function response(data: unknown, ok = true) { return { ok, json: async () => data }; }
const buttons = () => [...host.querySelectorAll("button")];
const button = (text: string) => buttons().find(node => node.textContent === text)!;
async function render() { await act(async () => root.render(<ForumPage />)); }
async function submit() { await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }
async function enter(text: string) {
  await act(async () => {
    const textarea = host.querySelector("textarea")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  fetchMock = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

it("conserva texto ante error de red, bloquea duplicados y permite reintentar", async () => {
  await render();
  await enter("Qué buen partido");
  let reject!: (error: Error) => void;
  fetchMock.mockImplementationOnce(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
  await submit(); await submit();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(button("Publicando...").disabled).toBe(true);
  expect(host.querySelector("textarea")!.disabled).toBe(true);
  await act(async () => reject(new TypeError("Failed to fetch")));
  expect(host.querySelector("textarea")!.value).toBe("Qué buen partido");
  expect(host.querySelector('[role="alert"]')!.textContent).toContain("Tu mensaje sigue acá");
  fetchMock.mockResolvedValueOnce(response({ id: "created" }));
  await submit();
  expect(host.querySelector("textarea")!.value).toBe("");
  expect(button("Publicar").disabled).toBe(false);
});

it("muestra rechazo del servidor conservando mensaje", async () => {
  await render(); await enter("Texto conservado");
  fetchMock.mockResolvedValueOnce(response({ error: "Demasiadas publicaciones" }, false));
  await submit();
  expect(host.querySelector('[role="alert"]')!.textContent).toBe("Demasiadas publicaciones");
  expect(host.querySelector("textarea")!.value).toBe("Texto conservado");
});

const post = { id: "post1", text: "Mensaje", createdAt: "2026-10-25T00:00:00Z", deletedAt: null, mentions: [], replies: [] };
it("moderación recupera errores de red y admite reintento sin duplicados", async () => {
  fetchMock.mockResolvedValueOnce(response([post]));
  await render();
  await act(async () => button("Ocultar publicación").click());
  let reject!: (error: Error) => void;
  fetchMock.mockImplementationOnce(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
  await act(async () => button("Sí, ocultar").click());
  expect(button("Ocultando...").disabled).toBe(true);
  await act(async () => button("Ocultando...").click());
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => reject(new TypeError("Failed to fetch")));
  expect(host.querySelector('[role="alertdialog"] [role="alert"]')!.textContent).toContain("Volvé a intentar");
  fetchMock.mockResolvedValueOnce(response({ id: post.id }));
  await act(async () => button("Sí, ocultar").click());
  expect(host.querySelector('[role="alertdialog"]')).toBeNull();
});

it("padres moderados conservan respuestas pero no ofrecen responder ni moderar nuevamente", async () => {
  fetchMock.mockResolvedValueOnce(response([{ ...post, deletedAt: "2026-10-25T00:10:00Z", text: "[contenido eliminado]", replies: [{ ...post, id: "reply", text: "Respuesta visible" }] }]));
  await render();
  const moderated = host.querySelector<HTMLElement>(".forum-post")!;
  expect(moderated.querySelector(":scope > .forum-actions .reply-button")).toBeNull();
  expect(moderated.querySelector(":scope > .forum-actions .moderate-button")).toBeNull();
  expect(host.textContent).toContain("Respuesta visible");
  expect(button("Responder")).toBeDefined();
});
