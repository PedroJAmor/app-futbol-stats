import type { Prisma } from "@prisma/client";

const MAX_RENDER_DEPTH = 20;

export const publicPostSelect = {
  id: true, text: true, parentId: true, createdAt: true, deletedAt: true, isHidden: true,
  mentions: { select: { token: true, labelSnapshot: true, match: { select: { id: true, isHidden: true } } } },
} satisfies Prisma.ForumPostSelect;

type Post = Prisma.ForumPostGetPayload<{ select: typeof publicPostSelect }>;
export function publicPost(post: Post) {
  const removed = post.isHidden || post.deletedAt !== null;
  return {
    id: post.id, parentId: post.parentId, createdAt: post.createdAt, deletedAt: removed ? post.deletedAt ?? post.createdAt : null, isHidden: removed,
    text: removed ? "[contenido eliminado]" : post.text,
    mentions: removed ? [] : post.mentions.map(mention => ({
      token: mention.token,
      labelSnapshot: mention.match && !mention.match.isHidden ? mention.labelSnapshot : "Partido no disponible",
      match: mention.match && !mention.match.isHidden ? { id: mention.match.id, isHidden: false } : null,
    })),
  };
}

type Node = ReturnType<typeof publicPost> & { replies: Node[] };
export function publicPostTree(posts: Post[]) {
  const nodes = new Map(posts.map(post => [post.id, { ...publicPost(post), replies: [] } as Node]));
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    // Bound legacy/corrupt trees too: preserve posts as roots instead of creating
    // cycles or deeply nested JSON that can crash the API/browser serializer.
    const visited = new Set([node.id]);
    let ancestor = parent;
    while (ancestor && visited.size < MAX_RENDER_DEPTH && !visited.has(ancestor.id)) {
      visited.add(ancestor.id);
      ancestor = ancestor.parentId ? nodes.get(ancestor.parentId) ?? null : null;
    }
    if (parent && !ancestor) parent.replies.push(node); else roots.push(node);
  }
  function visible(nodes: Node[]): Node[] {
    return nodes.map(node => ({ ...node, replies: visible(node.replies) })).filter(node => !node.isHidden || node.replies.length > 0);
  }
  return visible(roots);
}
