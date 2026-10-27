import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  current: vi.fn(),
  player: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  participation: { count: vi.fn() },
  transaction: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireRole: mocks.role,
  getCurrentUser: mocks.current,
  authErrorStatus: (error: unknown) => error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { player: mocks.player, $transaction: mocks.transaction } }));
import { POST } from "@/app/api/jugadores/route";
import { DELETE, PUT } from "@/app/api/jugadores/[id]/route";

const context = { params: { id: "7" } };
const request = (body: unknown) => new NextRequest("http://localhost/api/jugadores/7", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ role: "ADMIN" });
  mocks.player.findUnique.mockResolvedValue({ id: 7 });
  mocks.player.update.mockImplementation(async args => ({ id: 7, ...args.data }));
  mocks.participation.count.mockResolvedValue(0);
  mocks.transaction.mockImplementation(callback => callback({ player: mocks.player, matchParticipation: mocks.participation }));
});
it.each(["UNAUTHORIZED", "FORBIDDEN"])("rechaza escritura %s antes de leer datos", async message => {
  mocks.role.mockRejectedValue(new Error(message));
  const response = await PUT(request({ firstName: "Mimi" }), context);
  expect(response.status).toBe(message === "UNAUTHORIZED" ? 401 : 403);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("valida booleanos sin coaccionar strings", async () => {
  const response = await PUT(request({ isActive: "false" }), context);
  expect(response.status).toBe(400); expect(mocks.transaction).not.toHaveBeenCalled();
});
it("borra en transacción Serializable sin eliminación física", async () => {
  const response = await DELETE(request({}), context);
  expect(response.status).toBe(200);
  expect(mocks.role).toHaveBeenCalledWith("ADMIN");
  expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  expect(mocks.player.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { isHidden: true } });
});
it("devuelve conflicto al borrar con historial", async () => {
  mocks.participation.count.mockResolvedValue(1);
  const response = await DELETE(request({}), context);
  expect(response.status).toBe(409); expect(mocks.player.update).not.toHaveBeenCalled();
});
it("mapea conflictos concurrentes sin filtrar errores internos", async () => {
  mocks.transaction.mockRejectedValue({ code: "P2034", message: "private database details" });
  const response = await PUT(request({ isActive: false }), context);
  expect(response.status).toBe(409); expect(JSON.stringify(await response.json())).not.toContain("private");
});
it("devuelve 404 para un jugador inexistente", async () => {
  mocks.player.findUnique.mockResolvedValue(null);
  expect((await DELETE(request({}), context)).status).toBe(404);
});
it("valida nombre y fecha antes de crear", async () => {
  expect((await POST(request({ firstName: "A", birthDate: "2001-02-29" }))).status).toBe(400);
  expect(mocks.player.create).not.toHaveBeenCalled();
});
