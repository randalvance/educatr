import { pgTable, text, timestamp, uuid, integer, index } from 'drizzle-orm/pg-core';
import { topics, topicGroups } from './topics.ts';

export const flashcardDecks = pgTable(
  'flashcard_decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => topicGroups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    topicIdx: index('flashcard_decks_topic_idx').on(t.topicId),
    groupIdx: index('flashcard_decks_group_idx').on(t.groupId),
  }),
);

export const flashcards = pgTable(
  'flashcards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => flashcardDecks.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    front: text('front').notNull(),
    back: text('back').notNull(),
    hint: text('hint'),
  },
  (t) => ({
    deckIdx: index('flashcards_deck_idx').on(t.deckId, t.position),
  }),
);
