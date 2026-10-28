import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  venue: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  court: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
  goal: { upsert: vi.fn() }, match: { count: vi.fn() }, transaction: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({ requireRole: mocks.requireRole, authErrorStatus: (error: unknown) => error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 }));
vi.mock("@/features/security/rate-limit", () => ({ checkReadRateLimit: async () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: { venue: mocks.venue, $transaction: mocks.transaction } }));
import { venueInputSchema, courtInputSchema } from "./schemas";
import { saveCourt } from "./service";
import { GET, POST } from "@/app/api/canchas/route";
import { PUT as updateVenue } from "@/app/api/canchas/[id]/route";
import { POST as createCourt } from "@/app/api/canchas/[id]/pistas/route";
import { PUT as updateCourt } from "@/app/api/canchas/[id]/pistas/[courtId]/route";
const tx = { venue: mocks.venue, court: mocks.court, goal: mocks.goal, match: mocks.match } as any;
const request = (body: unknown = {}, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/canchas", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ role: "ADMIN" }); mocks.venue.findUnique.mockResolvedValue({ id: 1 });
  mocks.court.findFirst.mockResolvedValue({ id: 2 }); mocks.court.update.mockResolvedValue({ id: 2 }); mocks.court.create.mockResolvedValue({ id: 2 });
  mocks.match.count.mockResolvedValue(0); mocks.court.findUniqueOrThrow.mockResolvedValue({ id: 2, name: "F5", goals: [] });
  mocks.transaction.mockImplementation(fn => fn(tx));
});
describe("catálogo y canchas", () => {
  it("admite alta solo con nombre y rechaza enlaces ejecutables o pares incompletos", () => {
    expect(venueInputSchema.parse({ name: "  La   Avenida " })).toEqual({ name: "La Avenida" });
    expect(courtInputSchema.parse({ name: "Cancha 1" })).toEqual({ name: "Cancha 1" });
    for (const photoUrl of ["javascript:alert(1)", "http://example.com/photo", "https://user:pass@example.com"]) expect(venueInputSchema.safeParse({ name: "Rebote", photoUrl }).success).toBe(false);
    expect(courtInputSchema.safeParse({ name: "F5", goalNames: ["Pared"] }).success).toBe(false);
    expect(courtInputSchema.safeParse({ name: "F5", goalNames: ["Pared", "pared"] }).success).toBe(false);
  });
  it("el catálogo mantiene el array con id y nombre y extiende canchas", async () => {
    mocks.venue.findMany.mockResolvedValue([{ id: 1, name: "Rebote", courts: [] }]);
    expect(await (await GET(new Request("http://localhost:3000/api/canchas"))).json()).toEqual([{ id: 1, name: "Rebote", courts: [] }]);
  });
  it("guarda un predio sin exigir canchas, dirección ni fotos", async () => {
    mocks.venue.create.mockResolvedValue({ id: 1, name: "Rebote", courts: [] });
    expect((await POST(request({ name: "Rebote" }))).status).toBe(201);
    expect(mocks.venue.create.mock.calls[0][0].data).toMatchObject({ address: null, mapUrl: null, photoUrl: null });
  });
  it("renombra los arcos mediante sus posiciones estables, sin borrar historial", async () => {
    await saveCourt(tx, 1, { name: "F5", format: 5, goalNames: ["Buffet", "Pared"] }, 2);
    expect(mocks.goal.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.goal.upsert.mock.calls[0][0]).toMatchObject({ where: { courtId_position: { courtId: 2, position: 0 } }, update: { name: "Buffet" } });
  });
  it("bloquea formato incompatible con partidos y cancha de otro predio", async () => {
    mocks.match.count.mockResolvedValue(1);
    await expect(saveCourt(tx, 1, { name: "F5", format: 5 }, 2)).rejects.toThrow("partidos de otro formato");
    expect(mocks.court.update).not.toHaveBeenCalled();
    mocks.court.findFirst.mockResolvedValue(null);
    await expect(saveCourt(tx, 1, { name: "F5" }, 2)).rejects.toThrow("no pertenece");
  });
  it("todas las escrituras rechazan usuario común y origen externo antes de escribir", async () => {
    const actions = [() => POST(request()), () => updateVenue(request(), { params: Promise.resolve({ id: "1" }) }), () => createCourt(request(), { params: Promise.resolve({ id: "1" }) }), () => updateCourt(request(), { params: Promise.resolve({ id: "1", courtId: "2" }) })];
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    for (const action of actions) expect((await action()).status).toBe(403);
    expect(mocks.venue.create).not.toHaveBeenCalled(); expect(mocks.venue.update).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
    mocks.requireRole.mockReset();
    expect((await POST(request({ name: "Rebote" }, "https://example.org"))).status).toBe(403);
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });
});
