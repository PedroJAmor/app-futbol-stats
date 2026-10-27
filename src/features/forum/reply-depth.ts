import { prisma } from "@/lib/prisma";
import { RequestSecurityError } from "@/features/security/errors";

export const MAX_FORUM_DEPTH = 20;

export async function assertReplyParent(parentId: string) {
  const visited = new Set<string>();
  let id: string | null = parentId;
  while (id) {
    if (visited.size >= MAX_FORUM_DEPTH - 1 || visited.has(id)) {
      throw new RequestSecurityError("Esta conversación alcanzó el máximo de respuestas encadenadas. Creá una publicación nueva.", 400);
    }
    visited.add(id);
    const parent: { parentId: string | null; isHidden: boolean; deletedAt: Date | null } | null = await prisma.forumPost.findUnique({
      where: { id }, select: { parentId: true, isHidden: true, deletedAt: true },
    });
    if (!parent || (id === parentId && (parent.isHidden || parent.deletedAt))) {
      throw new RequestSecurityError("Post padre inválido", 400);
    }
    id = parent.parentId;
  }
}
