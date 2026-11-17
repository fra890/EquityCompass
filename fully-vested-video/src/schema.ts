import {z} from 'zod';

const shared = {
  logoFile: z.string().nullable().optional(),
  audioFile: z.string().nullable().optional(),
  beatSeconds: z.number().min(0.3).max(10),
  /** true: always show layout guides. false: never. Leave unset: preview only. */
  showGuides: z.boolean().optional(),
};

export const introSchema = z.object({
  episodeNumber: z.union([z.number(), z.string()]).nullable().optional(),
  episodeTitle: z.string().nullable().optional(),
  ...shared,
});

export const outroSchema = z.object({
  hostName: z.string(),
  hostTitle: z.string(),
  firmName: z.string(),
  cta: z.string(),
  url: z.string(),
  disclosure: z.string(),
  /** true: host zone is see-through (for the ProRes 4444 overlay). */
  transparent: z.boolean(),
  ...shared,
});

export type IntroProps = z.infer<typeof introSchema>;
export type OutroProps = z.infer<typeof outroSchema>;
