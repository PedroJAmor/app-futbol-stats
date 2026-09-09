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
  venueId: z.number().int().positive().nullish(),
  newVenueName: z.string().trim().min(1).max(100).nullish(),
  priceCents: z.number().int().nonnegative().nullish(),
  weather: z.string().trim().nullish(),
  temperature: z.number().nullish(),
  notes: z.string().trim().nullish(),
  mvpId: z.number().int().positive().nullish(),
  teams: z.array(teamSchema).length(2),
}).refine((input) => !(input.venueId && input.newVenueName), {
  message: "Elegí una cancha existente o agregá una nueva",
  path: ["venueId"],
});

export type MatchInput = z.infer<typeof matchInputSchema>;
