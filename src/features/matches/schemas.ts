import { z } from "zod";
import { isCalendarDate } from "@/lib/dates";

const positiveInt = z.number().int().positive().max(2_147_483_647);

const teamSchema = z.object({
  side: z.enum(["A", "B"]),
  color: z.string().trim().min(1).max(100),
  result: z.enum(["WIN", "LOSS", "DRAW"]),
  playerIds: z.array(positiveInt).min(1),
});

export const matchInputSchema = z.object({
  date: z.string().refine(isCalendarDate, "La fecha no es válida"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora no es válida"),
  format: positiveInt,
  venueId: positiveInt.nullish(),
  newVenueName: z.string().trim().min(1).max(100).nullish(),
  priceCents: z.number().int().nonnegative().max(2_147_483_647).nullish(),
  weather: z.string().trim().max(100).nullish(),
  temperature: z.number().finite().min(-999.99).max(999.99).nullish(),
  notes: z.string().trim().max(10_000).nullish(),
  mvpId: positiveInt.nullish(),
  teams: z.array(teamSchema).length(2),
}).refine((input) => !(input.venueId && input.newVenueName), {
  message: "Elegí una cancha existente o agregá una nueva",
  path: ["venueId"],
});

export type MatchInput = z.infer<typeof matchInputSchema>;
