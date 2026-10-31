import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const { findFirst, findMany } = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { match: { findFirst }, player: { findMany } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/matches/MatchAdminActions", () => ({ default: () => null }));
import MatchPage from "@/app/partidos/[id]/page";

beforeEach(() => { findFirst.mockReset(); findMany.mockReset().mockResolvedValue([]); });
it.each(["abc", "0", "-1", "1.5", "2147483648", "1e2"])("responde 404 sin consultar Prisma para ID %s", async id => {
  await expect(MatchPage({ params: Promise.resolve({ id }) })).rejects.toThrow("NOT_FOUND");
  expect(findFirst).not.toHaveBeenCalled();
});
it("responde 404 si un partido válido no existe o está oculto", async () => {
  findFirst.mockResolvedValue(null);
  await expect(MatchPage({ params: Promise.resolve({ id: "123" }) })).rejects.toThrow("NOT_FOUND");
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 123, isHidden: false } }));
});

it.each([false, true])("solo etiqueta al ganador; en empate no repite el resultado sobre las tablas (%s)", async draw => {
  findFirst.mockResolvedValueOnce({ id: 1, playedAt: new Date('2026-10-24T18:00:00Z'), format: 7, category: 'LEAGUE', priceCents: 8400000, temperature: 20, weather: 'soleado', notes: null, venue: null, court: null, mvp: null,
    teams: [{ id: 1, color: 'Oscuro', result: draw ? 'DRAW' : 'LOSS', participations: [], defendedGoal: null }, { id: 2, color: 'Claro', result: draw ? 'DRAW' : 'WIN', participations: [], defendedGoal: null }],
  }).mockResolvedValue(null);
  const html = renderToStaticMarkup(await MatchPage({ params: Promise.resolve({ id: '1' }) }));
  const titles = [...html.matchAll(/class="team-sheet-title"[^>]*>(.*?)<\/div>/g)].map(item => item[1]);
  expect(titles).toEqual(draw ? ['', ''] : ['', '<strong>Ganador</strong>']);
  expect(html).toContain(draw ? '>Empate<' : '>Ganó Claro<');
});
