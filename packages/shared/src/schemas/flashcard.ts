import { z } from 'zod';

export const Flashcard = z.object({
  id: z.string().uuid(),
  deckId: z.string().uuid(),
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().nullable(),
  position: z.number().int().nonnegative(),
});
export type Flashcard = z.infer<typeof Flashcard>;

export const FlashcardDeck = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  topicId: z.string().uuid().nullable(),
  groupId: z.string().uuid().nullable(),
  title: z.string(),
  createdAt: z.string().datetime(),
});
export type FlashcardDeck = z.infer<typeof FlashcardDeck>;

export const FlashcardDeckWithCards = FlashcardDeck.extend({
  cards: z.array(Flashcard),
});
export type FlashcardDeckWithCards = z.infer<typeof FlashcardDeckWithCards>;

export const FlashcardGeneration = z.object({
  title: z.string(),
  cards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        hint: z.string().optional(),
      }),
    )
    .min(3)
    .max(40),
});
export type FlashcardGeneration = z.infer<typeof FlashcardGeneration>;

export const GenerateFlashcardsInput = z.object({
  topicId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  cardCount: z.number().int().min(3).max(40).default(12),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInput>;
