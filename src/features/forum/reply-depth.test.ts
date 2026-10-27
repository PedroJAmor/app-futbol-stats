import { beforeEach, expect, it, vi } from "vitest";
const find = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { forumPost: { findUnique: find } } }));
import { assertReplyParent, MAX_FORUM_DEPTH } from "./reply-depth";
beforeEach(() => { find.mockReset(); });
it("admite respuestas normales y rechaza un padre oculto o inexistente", async () => {
  find.mockResolvedValue({ parentId: null, isHidden: false, deletedAt: null });
  await expect(assertReplyParent("a")).resolves.toBeUndefined();
  find.mockResolvedValue({ parentId: null, isHidden: true, deletedAt: null });
  await expect(assertReplyParent("a")).rejects.toMatchObject({ status: 400 });
  find.mockResolvedValue(null); await expect(assertReplyParent("a")).rejects.toMatchObject({ status: 400 });
});
it("limita profundidad con lecturas acotadas y detecta ciclos", async () => {
  find.mockImplementation(async ({ where }) => ({ parentId: String(Number(where.id) + 1), isHidden: false, deletedAt: null }));
  await expect(assertReplyParent("1")).rejects.toMatchObject({ status: 400 });
  expect(find).toHaveBeenCalledTimes(MAX_FORUM_DEPTH - 1);
  find.mockReset().mockResolvedValue({ parentId: "a", isHidden: false, deletedAt: null });
  await expect(assertReplyParent("a")).rejects.toMatchObject({ status: 400 }); expect(find).toHaveBeenCalledTimes(1);
});
it("conserva la posibilidad de responder a un descendiente visible de un post moderado", async () => {
  find.mockImplementation(async ({ where }) => where.id === "child" ? { parentId: "root", isHidden: false, deletedAt: null } : { parentId: null, isHidden: true, deletedAt: new Date() });
  await expect(assertReplyParent("child")).resolves.toBeUndefined();
});
