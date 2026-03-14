import { z } from "zod";

export const TennisPlayerSchema = z.object({
  id: z.string(), // stable: "mytennis:{externalId}"
  externalSource: z.literal("mytennis"),
  externalId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  licenceNumber: z.string().nullable().optional(),
  classification: z.string().nullable().optional(),
  classificationValue: z.number().nullable().optional(),
  competitionValue: z.number().nullable().optional(),
  ranking: z.number().nullable().optional(),
  bestClassification: z.string().nullable().optional(),
  bestRanking: z.number().nullable().optional(),
  lastClassification: z.string().nullable().optional(),
  lastRanking: z.number().nullable().optional(),
  ageCategory: z.string().nullable().optional(),
  licenseStatus: z.string().nullable().optional(),
  interclubStatus: z.string().nullable().optional(),
  fetchedAt: z.string().nullable().optional(),
});

export const TennisPlayerClubSchema = z.object({
  playerExternalId: z.number(),
  clubName: z.string(),
  memberRelationship: z.number().nullable().optional(),
});

export type TennisPlayer = z.infer<typeof TennisPlayerSchema>;
export type TennisPlayerClub = z.infer<typeof TennisPlayerClubSchema>;
