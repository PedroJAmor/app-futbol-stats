import { z } from "zod";

const teamSchema = z.object({
  side: z.enum(["A", "B"]),
  color: z.string().trim().min(1),
  result: z.enum(["WIN", "LOSS", "DRAW"]),
  playerIds: z.array(z.number().int().positive()).min(1),
});

export const matchInputSchema = z.object({
  date: z.string(),
  time: z.string(),
  format: z.number().int().positive(),
  venue: z.string().trim().nullish(),
  priceCents: z.number().int().nonnegative().nullish(),
  weather: z.string().trim().nullish(),
  temperature: z.number().nullish(),
  notes: z.string().trim().nullish(),
  mvpId: z.number().int().positive().nullish(),
  teams: z.array(teamSchema).length(2),
});

export type MatchInput = z.infer<typeof matchInputSchema>;
