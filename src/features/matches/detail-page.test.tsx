import { beforeEach, expect, it, vi } from "vitest";
const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { match: { findFirst } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/matches/MatchAdminActions", () => ({ default: () => null }));
import MatchPage from "@/app/partidos/[id]/page";

beforeEach(() => findFirst.mockReset());
it.each(["abc", "0", "-1", "1.5", "2147483648", "1e2"])("responde 404 sin consultar Prisma para ID %s", async id => {
  await expect(MatchPage({ params: { id } })).rejects.toThrow("NOT_FOUND");
  expect(findFirst).not.toHaveBeenCalled();
});
it("responde 404 si un partido válido no existe o está oculto", async () => {
  findFirst.mockResolvedValue(null);
  await expect(MatchPage({ params: { id: "123" } })).rejects.toThrow("NOT_FOUND");
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 123, isHidden: false } }));
});
