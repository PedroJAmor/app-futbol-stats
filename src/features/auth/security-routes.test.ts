import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  role: vi.fn(), transaction: vi.fn(),
  user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
  player: { findFirst: vi.fn() },
  forumPost: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  match: { findMany: vi.fn() }, rate: vi.fn(), mentions: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({ requireRole: mocks.role, authErrorStatus: (error: unknown) => error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500 }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: mocks.user, player: mocks.player, forumPost: mocks.forumPost, match: mocks.match, $transaction: mocks.transaction } }));
vi.mock("@/features/forum/rate-limit", () => ({ consumeAnonymousRateLimit: mocks.rate }));
vi.mock("@/features/forum/mentions", () => ({ buildMentionCreates: mocks.mentions, createMatchMentionToken: () => "token" }));
import { PATCH } from "@/app/api/admin/users/[id]/route";
import { POST as upload } from "@/app/api/upload/route";
import { POST as publish, GET as posts } from "@/app/api/forum/route";
import { GET as mentionSuggestions } from "@/app/api/mentions/route";
const userId = "cl000000000000000000000000";
const req = (body: unknown) => new NextRequest("http://localhost/api/test", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
beforeEach(() => {
  vi.resetAllMocks(); mocks.role.mockResolvedValue({ role: "ADMIN" });
  mocks.transaction.mockImplementation(callback => callback({ user: mocks.user, player: mocks.player }));
  mocks.user.findUnique.mockResolvedValue({ id: userId, role: "USER" });
  mocks.user.update.mockResolvedValue({ id: userId, role: "USER" });
  mocks.player.findFirst.mockResolvedValue({ id: 7 }); mocks.mentions.mockResolvedValue([]);
});
it("la edición de cuentas requiere autorización antes de procesar datos", async () => {
  mocks.role.mockRejectedValue(new Error("UNAUTHORIZED"));
  expect((await PATCH(req({ role: "SUPERADMIN" }), { params: { id: userId } })).status).toBe(401);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("roles protegidos y vinculación dentro de transacción Serializable", async () => {
  expect((await PATCH(req({ role: "SUPERADMIN" }), { params: { id: userId } })).status).toBe(403);
  expect(mocks.user.update).not.toHaveBeenCalled();
  expect((await PATCH(req({ playerId: 7 }), { params: { id: userId } })).status).toBe(200);
  expect(mocks.transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
});
it("upload deniega invitados sin realizar llamadas externas", async () => {
  const external = vi.fn(); vi.stubGlobal("fetch", external); mocks.role.mockRejectedValue(new Error("FORBIDDEN"));
  expect((await upload(req({ imagen: "anything" }))).status).toBe(403); expect(external).not.toHaveBeenCalled(); vi.unstubAllGlobals();
});
it("upload rechaza MIME falsificado sin realizar llamadas externas", async () => {
  const external = vi.fn(); vi.stubGlobal("fetch", external);
  expect((await upload(req({ imagen: "data:image/jpeg;base64,YWJj" }))).status).toBe(400); expect(external).not.toHaveBeenCalled(); vi.unstubAllGlobals();
});
it("foro público no requiere sesión ni almacena identidad enviada por el cliente", async () => {
  const date = new Date(); mocks.forumPost.create.mockImplementation(async ({ data }) => ({ id: userId, ...data, mentions: [], createdAt: date, deletedAt: null, isHidden: false }));
  const response = await publish(req({ text: "Hola", userId: "identity", email: "private@example.com" }));
  expect(response.status).toBe(201); expect(mocks.role).not.toHaveBeenCalled();
  expect(mocks.forumPost.create.mock.calls[0][0].data).toEqual({ text: "Hola", parentId: null, mentions: { create: [] } });
});
it("foro rechaza respuestas a publicaciones ocultas", async () => {
  mocks.forumPost.findUnique.mockResolvedValue({ isHidden: true, deletedAt: null });
  expect((await publish(req({ text: "Hola", parentId: userId }))).status).toBe(400); expect(mocks.forumPost.create).not.toHaveBeenCalled();
});
it("foro conserva rate limit y honeypot sin publicar", async () => {
  mocks.rate.mockRejectedValue(new Error("RATE_LIMITED"));
  expect((await publish(req({ text: "Hola" }))).status).toBe(429);
  expect((await publish(req({ text: "Hola", website: "spam" }))).status).toBe(201);
  expect(mocks.forumPost.create).not.toHaveBeenCalled();
});
it("foro GET usa select acotado sin datos privados de partidos", async () => {
  mocks.forumPost.findMany.mockResolvedValue([]); await posts();
  const selection = mocks.forumPost.findMany.mock.calls[0][0].select;
  expect(selection.mentions.select.match.select).toEqual({ id: true, isHidden: true });
});
it("sugerencias rechazan ids fuera de rango sin consultar", async () => {
  const response = await mentionSuggestions(new NextRequest("http://localhost/api/mentions?query=999999999999999999"));
  expect(response.status).toBe(400); expect(mocks.match.findMany).not.toHaveBeenCalled();
});
