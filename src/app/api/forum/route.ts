import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forumPostSchema } from "@/features/forum/schemas";
import { buildMentionCreates } from "@/features/forum/mentions";
import { consumeAnonymousRateLimit } from "@/features/forum/rate-limit";
import { publicPost, publicPostSelect, publicPostTree } from "@/features/forum/public-posts";

export async function GET() {
  const posts = await prisma.forumPost.findMany({
    orderBy: { createdAt: "desc" },
    select: publicPostSelect,
  });
  return NextResponse.json(publicPostTree(posts));
}

export async function POST(request: NextRequest) {
  try {
    const input = forumPostSchema.parse(await request.json());
    if (input.website) return NextResponse.json({ ok: true }, { status: 201 });
    await consumeAnonymousRateLimit(request);
    if (input.parentId) {
      const parent = await prisma.forumPost.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.deletedAt || parent.isHidden) return NextResponse.json({ error: "Post padre inválido" }, { status: 400 });
    }
    const mentions = await buildMentionCreates(input.text);
    const post = await prisma.forumPost.create({
      data: {
        text: input.text,
        parentId: input.parentId || null,
        mentions: { create: mentions },
      },
      select: publicPostSelect,
    });
    return NextResponse.json(publicPost(post), { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400;
    return NextResponse.json({ error: status === 429 ? "Demasiadas publicaciones. Probá más tarde." : "No se pudo publicar." }, { status });
  }
}
