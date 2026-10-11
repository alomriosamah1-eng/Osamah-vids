// عقد المشهد — مخطط zod (المرجع الوحيد). راجع docs/scene-contract.md
import { z } from 'zod';

export const animationSchema = z.object({
  in: z.enum(['fade', 'fadeUp', 'pop', 'slideL', 'slideR', 'snap', 'draw']).default('fade'),
  delay: z.number().int().min(0).default(0),
  dur: z.number().int().min(100).max(5000).default(500),
  out: z.object({
    kind: z.enum(['fade', 'fadeUp', 'slideL', 'slideR']).default('fade'),
    delay: z.number().int().min(0).default(0),
    dur: z.number().int().min(100).max(3000).default(300),
  }).optional(),
}).strict();

export const textLayerSchema = z.object({
  kind: z.literal('text'),
  text: z.string().min(1),
  tone: z.enum(['kicker', 'title', 'subtitle', 'body']).default('body'),
  align: z.enum(['left', 'center', 'right']).default('center'),
  color: z.string().optional(),
  animation: animationSchema.default({}),
}).strict();

export const counterLayerSchema = z.object({
  kind: z.literal('counter'),
  to: z.number(),
  from: z.number().default(0),
  decimals: z.number().int().min(0).max(6).default(0),
  suffix: z.string().default(''),
  prefix: z.string().default(''),
  position: z.enum(['top', 'center', 'bottom']).default('center'),
  animation: animationSchema.default({}),
}).strict();

export const shapeLayerSchema = z.object({
  kind: z.literal('shape'),
  shape: z.enum(['line', 'rect', 'circle']),
  color: z.string().default('#4ceaff'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  radius: z.number().int().positive().optional(),
  animation: animationSchema.default({}),
}).strict();

export const chartLayerSchema = z.object({
  kind: z.literal('chart'),
  chart: z.enum(['bar', 'line', 'donut']),
  data: z.array(z.number()).min(1),
  labels: z.array(z.string()).optional(),
  color: z.string().default('#4ceaff'),
  animate: z.boolean().default(true),
}).strict();

export const networkLayerSchema = z.object({
  kind: z.literal('network'),
  density: z.number().min(0.05).max(1).default(0.3),
  seed: z.number().int().default(1),
  color: z.string().default('#4ceaff'),
}).strict();

export const timelineLayerSchema = z.object({
  kind: z.literal('timeline'),
  events: z.array(z.object({ year: z.string(), label: z.string() })).min(1),
  color: z.string().default('#4ceaff'),
}).strict();

export const layerSchema = z.discriminatedUnion('kind', [
  textLayerSchema,
  counterLayerSchema,
  shapeLayerSchema,
  chartLayerSchema,
  networkLayerSchema,
  timelineLayerSchema,
]);

export const sceneSchema = z.object({
  _contractVersion: z.literal(1).default(1),
  id: z.string().min(1),
  title: z.string().default(''),
  durationMs: z.number().int().min(1500).max(3_600_000),
  background: z.object({
    type: z.enum(['solid', 'gradient']),
    colors: z.array(z.string()).min(1).max(2),
    angle: z.number().int().min(0).max(360).default(135),
  }).default({ type: 'gradient', colors: ['#131f38', '#0b101d'] }),
  layers: z.array(layerSchema).min(1),
  onScreenText: z.string().default(''),
  voiceText: z.string().default(''),
  musicMood: z.enum(['warm', 'tense', 'epic', 'calm', 'tech', 'none']).default('warm'),
}).strict();

export type Scene = z.infer<typeof sceneSchema>;
export type SceneLayer = z.infer<typeof layerSchema>;
export type Animation = z.infer<typeof animationSchema>;

export function parseScene(input: unknown): { ok: true; scene: Scene } | { ok: false; errors: string[] } {
  const r = sceneSchema.safeParse(input);
  if (r.success) return { ok: true, scene: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}