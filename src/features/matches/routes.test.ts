vi.mock("@/features/security/rate-limit", () => ({ checkReadRateLimit: vi.fn().mockResolvedValue(null), consumeUploadRateLimit: vi.fn().mockResolvedValue(undefined) }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), getCurrentUser: vi.fn(), transaction: vi.fn(), playerCount: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), teamCreate: vi.fn(), teamUpsert: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ requireRole: mocks.requireRole, getCurrentUser: mocks.getCurrentUser, authErrorStatus: (e: Error) => e.message === "UNAUTHORIZED" ? 401 : e.message === "FORBIDDEN" ? 403 : 500 }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction, match: { update: mocks.update, findUnique: mocks.findUnique } } }));
import { POST } from "@/app/api/partidos/route";
import { PUT, DELETE, PATCH, GET } from "@/app/api/partidos/[id]/route";
const input = { date: "2026-10-24", time: "21:00", format: 7, weather: "Despejado", mvpId: 1, teams: [{ side: "A", color: "Oscuro", result: "WIN", playerIds: [1] }, { side: "B", color: "Claro", result: "LOSS", playerIds: [2] }] };
const request = (body: unknown, method = "POST") => new NextRequest("http://localhost/api/partidos/7", { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json", Origin: "http://localhost" } });
const params = { params: Promise.resolve({ id: "7" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ role: "ADMIN" });
  mocks.playerCount.mockResolvedValue(2);
  mocks.create.mockResolvedValue({ id: 7 });
  mocks.update.mockResolvedValue({ id: 7 });
  mocks.teamCreate.mockResolvedValue({ id: 11 });
  mocks.teamUpsert.mockResolvedValue({ id: 11 });
  mocks.findUniqueOrThrow.mockResolvedValue({ id: 7 });
  mocks.transaction.mockImplementation(async callback => callback({ player: { count: mocks.playerCount }, match: { create: mocks.create, update: mocks.update, findUniqueOrThrow: mocks.findUniqueOrThrow }, matchTeam: { create: mocks.teamCreate, upsert: mocks.teamUpsert }, matchParticipation: { createMany: mocks.createMany, deleteMany: mocks.deleteMany } }));
});
describe("contrato de escritura de partidos", () => {
  it.each(["UNAUTHORIZED", "FORBIDDEN"])("rechaza %s antes de procesar o escribir", async message => {
    mocks.requireRole.mockRejectedValue(new Error(message));
    const response = await POST(request(input));
    expect(response.status).toBe(message === "UNAUTHORIZED" ? 401 : 403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rechaza fechas imposibles y jugadores duplicados antes de escribir", async () => {
    for (const body of [{ ...input, date: "2026-02-30" }, { ...input, teams: [{ ...input.teams[0], playerIds: [1, 1] }, input.teams[1]] }]) expect((await POST(request(body))).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("comprueba visibilidad de participantes dentro de la transacción y no elimina equipos ante conflicto", async () => {
    mocks.playerCount.mockResolvedValue(1);
    const response = await PUT(request(input, "PUT"), params);
    expect(response.status).toBe(409);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.playerCount).toHaveBeenCalledWith({ where: { id: { in: [1, 2] }, isHidden: false } });
  });
  it("guarda clima, MVP y fecha Argentina con aislamiento Serializable", async () => {
    expect((await POST(request(input))).status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ weather: "Despejado", mvpId: 1, playedAt: new Date("2026-10-25T00:00:00Z") }) });
    expect(mocks.createMany).toHaveBeenCalledTimes(2);
  });
  it("edita ambos equipos en una única transacción", async () => {
    expect((await PUT(request(input, "PUT"), params)).status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { matchId: 7 } });
    expect(mocks.teamUpsert).toHaveBeenCalledTimes(2);
  });
  it("oculta y restaura sin eliminación física", async () => {
    expect((await DELETE(request({}, "DELETE"), params)).status).toBe(200);
    expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: 7 }, data: { isHidden: true, hiddenAt: expect.any(Date) } });
    expect((await PATCH(request({}, "PATCH"), params)).status).toBe(200);
    expect(mocks.update).toHaveBeenLastCalledWith({ where: { id: 7 }, data: { isHidden: false, hiddenAt: null } });
  });
  it("devuelve 400 para IDs inválidos y 404 para registros inexistentes", async () => {
    expect((await DELETE(request({}, "DELETE"), { params: Promise.resolve({ id: "NaN" }) })).status).toBe(400);
    mocks.update.mockRejectedValue({ code: "P2025" });
    expect((await DELETE(request({}, "DELETE"), params)).status).toBe(404);
  });
  it("no expone errores internos y permite reintentar conflictos concurrentes", async () => {
    mocks.transaction.mockRejectedValue({ code: "P2034" });
    expect((await POST(request(input))).status).toBe(409);
    mocks.transaction.mockRejectedValue(new Error("private database credentials"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("credentials");
  });
  it("oculta el detalle borrado a invitados", async () => {
    mocks.findUnique.mockResolvedValue({ id: 7, isHidden: true });
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(request({}, "POST"), params)).status).toBe(404);
    mocks.getCurrentUser.mockResolvedValue({ role: "ADMIN" });
    expect((await GET(request({}, "POST"), params)).status).toBe(200);
  });
});
