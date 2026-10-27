import { checkReadRateLimit } from "@/features/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/features/security/request";
import { securityErrorResponse } from "@/features/security/errors";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forumPostSchema } from "@/features/forum/schemas";
import { buildMentionCreates } from "@/features/forum/mentions";
import { consumeAnonymousRateLimit } from "@/features/forum/rate-limit";
import { publicPost, publicPostSelect, publicPostTree } from "@/features/forum/public-posts";
import { assertReplyParent } from "@/features/forum/reply-depth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateFailure = await checkReadRateLimit(request);
  if (rateFailure) return rateFailure;
  const posts = await prisma.forumPost.findMany({
    orderBy: { createdAt: "desc" },
    select: publicPostSelect,
  });
  return NextResponse.json(publicPostTree(posts));
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = forumPostSchema.parse(await readJsonBody(request, 8 * 1024));
    if (input.website) return NextResponse.json({ ok: true }, { status: 201 });
    await consumeAnonymousRateLimit(request);
    if (input.parentId) await assertReplyParent(input.parentId);
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
    const securityFailure = securityErrorResponse(error);
    if (securityFailure) return securityFailure;
    return NextResponse.json({ error: "No se pudo publicar." }, { status: 400 });
  }
}
