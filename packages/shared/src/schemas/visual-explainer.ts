import { z } from 'zod';

export const VisualExplainer = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  topicId: z.string().uuid(),
  diagramSource: z.string().min(1),
  narrativeMarkdown: z.string().min(1),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
export type VisualExplainer = z.infer<typeof VisualExplainer>;

export const VisualExplainerGeneration = z.object({
  diagramSource: z.string().min(1),
  narrativeMarkdown: z.string().min(1),
});
export type VisualExplainerGeneration = z.infer<typeof VisualExplainerGeneration>;
