import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ matches: vi.fn(), rows: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { match: { findMany: mocks.matches }, matchParticipation: { findMany: mocks.rows } } }));
vi.mock("@/features/security/rate-limit", () => ({ checkReadRateLimit: vi.fn().mockResolvedValue(null) }));
import { GET } from "@/app/api/stats/equipos-mes/route";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-01T02:59:59Z")); mocks.matches.mockReset().mockResolvedValue([]); mocks.rows.mockReset().mockResolvedValue([]); });
afterEach(() => { vi.useRealTimers(); });
it("rechaza consultar el mes actual por API antes de leer partidos", async () => {
  const response = await GET(new NextRequest("http://localhost/api/stats/equipos-mes?month=2026-10"));
  expect(response.status).toBe(400); expect(mocks.matches).not.toHaveBeenCalled(); expect(mocks.rows).not.toHaveBeenCalled();
});
it("habilita octubre al cambiar de mes en Argentina, aun cuando está vacío", async () => {
  vi.setSystemTime(new Date("2026-11-01T03:00:00Z"));
  const response = await GET(new NextRequest("http://localhost/api/stats/equipos-mes"));
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ month: "2026-10", months: ["2026-10"], best: [], worst: [], candidateCount: 0 });
});
it("siempre incluye todos los tipos aunque un cliente anterior envíe categorías", async () => {
  const response = await GET(new NextRequest("http://localhost/api/stats/equipos-mes?month=2026-09&categories=LEAGUE,SPECIAL"));
  expect(response.status).toBe(200);
  expect(mocks.rows.mock.calls[0][0].where.match).not.toHaveProperty("category");
  expect(mocks.matches.mock.calls[0][0].where).not.toHaveProperty("category");
  expect(mocks.rows.mock.calls[0][0].where.match).toMatchObject({ isHidden: false, playedAt: { gte: new Date("2026-09-01T03:00:00Z"), lt: new Date("2026-10-01T03:00:00Z") } });
});
