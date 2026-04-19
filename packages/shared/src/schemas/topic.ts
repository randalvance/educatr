import { z } from 'zod';

export const Topic = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string(),
  bodyMarkdown: z.string(),
  tags: z.array(z.string()),
  groupId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Topic = z.infer<typeof Topic>;

export const TopicGroup = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  summary: z.string(),
  createdAt: z.string().datetime(),
});
export type TopicGroup = z.infer<typeof TopicGroup>;

/**
 * Structured shape emitted by the topic-extraction pipeline for a single chat turn.
 * Zero-to-many of these can be produced per turn.
 */
export const TopicCandidate = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  bodyMarkdown: z.string().min(1),
  tags: z.array(z.string()).max(12),
});
export type TopicCandidate = z.infer<typeof TopicCandidate>;

export const TopicCandidateList = z.object({
  candidates: z.array(TopicCandidate),
});
export type TopicCandidateList = z.infer<typeof TopicCandidateList>;

export const UpdateTopicInput = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  summary: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateTopicInput = z.infer<typeof UpdateTopicInput>;
