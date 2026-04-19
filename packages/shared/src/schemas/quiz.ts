import { z } from 'zod';

export const MultipleChoiceQuestion = z.object({
  type: z.literal('multiple_choice'),
  prompt: z.string(),
  choices: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string().optional(),
});
export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestion>;

export const TrueFalseQuestion = z.object({
  type: z.literal('true_false'),
  prompt: z.string(),
  correctAnswer: z.boolean(),
  explanation: z.string().optional(),
});
export type TrueFalseQuestion = z.infer<typeof TrueFalseQuestion>;

export const ShortAnswerQuestion = z.object({
  type: z.literal('short_answer'),
  prompt: z.string(),
  acceptedAnswers: z.array(z.string()).min(1),
  explanation: z.string().optional(),
});
export type ShortAnswerQuestion = z.infer<typeof ShortAnswerQuestion>;

export const QuizQuestion = z.discriminatedUnion('type', [
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ShortAnswerQuestion,
]);
export type QuizQuestion = z.infer<typeof QuizQuestion>;

export const Quiz = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  topicId: z.string().uuid().nullable(),
  groupId: z.string().uuid().nullable(),
  title: z.string(),
  questions: z.array(QuizQuestion).min(1),
  createdAt: z.string().datetime(),
});
export type Quiz = z.infer<typeof Quiz>;

/** Shape the AI returns before persistence (no ids, no timestamps). */
export const QuizGeneration = z.object({
  title: z.string(),
  questions: z.array(QuizQuestion).min(3).max(20),
});
export type QuizGeneration = z.infer<typeof QuizGeneration>;

export const GenerateQuizInput = z.object({
  topicId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  questionCount: z.number().int().min(3).max(20).default(8),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInput>;
