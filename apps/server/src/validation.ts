// مخطط zod لخيارات إنشاء المشروع (توازي packages/core مع Validation طولي).
import { z } from 'zod';

export const ProjectOptionsSchema = z.object({
  durationSeconds: z.number().int().min(10).max(3600),
  orientation: z.enum(['horizontal', 'vertical']),
  style: z.string().min(1),
  voice: z.enum(['female', 'male']),
  quality: z.enum(['720p', '1080p', '1440p']),
  captions: z.boolean().default(true),
  music: z.boolean().default(true),
});

export type ProjectOptionsInput = z.infer<typeof ProjectOptionsSchema>;