import { expect, it } from "vitest";
import { publicPost, publicPostTree } from "./public-posts";
const date = new Date("2026-10-25T00:00:00Z");
const post = (id: string, parentId: string | null = null, hidden = false) => ({ id, parentId, isHidden: hidden, text: "Texto privado al moderar", createdAt: date, deletedAt: null, mentions: [{ token: "tkn_test", labelSnapshot: "F7 · Cancha secreta", match: { id: 7, isHidden: false } }] });
it("oculta texto y menciones moderados incluso cuando el texto original sigue en DB", () => {
  expect(publicPost(post("a", null, true))).toMatchObject({ text: "[contenido eliminado]", mentions: [], isHidden: true });
});
it("conserva padres moderados con descendientes visibles y elimina ramas ocultas vacías", () => {
  const tree = publicPostTree([post("a", null, true), post("b", "a", true), post("c", "b"), post("d", "a", true), post("e", null, true)]);
  expect(tree).toHaveLength(1); expect(tree[0].text).toBe("[contenido eliminado]");
  expect(tree[0].replies.map(item => item.id)).toEqual(["b"]); expect(tree[0].replies[0].replies[0].id).toBe("c");
});
it("no revela snapshot ni enlace de una mención a partido oculto", () => {
  const value = post("a"); value.mentions[0].match.isHidden = true;
  expect(publicPost(value).mentions).toEqual([{ token: "tkn_test", labelSnapshot: "Partido no disponible", match: null }]);
});
it("la proyección no devuelve propiedades adicionales ni datos de cuentas", () => {
  const value = { ...post("a"), userId: "identity", fingerprintHash: "hash", mentions: [{ ...post("a").mentions[0], match: { id: 7, isHidden: false, notes: "private" } }] };
  const result = JSON.stringify(publicPost(value)); expect(result).not.toMatch(/identity|hash|private|notes/);
});
it("serializa cadenas históricas de 5000 respuestas sin perder publicaciones ni desbordar", () => {
  const posts = Array.from({ length: 5000 }, (_, i) => post(String(i), i ? String(i - 1) : null));
  const tree = publicPostTree(posts);
  expect(() => JSON.stringify(tree)).not.toThrow();
  const pending = tree.map(node => ({ node, depth: 1 })); const seen = new Set<string>();
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    expect(depth).toBeLessThanOrEqual(20); expect(seen.has(node.id)).toBe(false); seen.add(node.id);
    pending.push(...node.replies.map(child => ({ node: child, depth: depth + 1 })));
  }
  expect(seen.size).toBe(5000);
});
it("recupera ciclos como publicaciones raíz sin crear JSON cíclico", () => {
  const tree = publicPostTree([post("a", "b"), post("b", "a"), post("c", "c")]);
  expect(() => JSON.stringify(tree)).not.toThrow(); expect(tree.map(node => node.id)).toEqual(["a", "b", "c"]);
});
