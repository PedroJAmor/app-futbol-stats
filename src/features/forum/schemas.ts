import { z } from "zod";

export const forumPostSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  parentId: z.string().cuid().nullish(),
  website: z.string().max(200).optional().default(""),
});
