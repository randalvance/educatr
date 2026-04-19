import { pgTable, text, timestamp, uuid, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { topics, topicGroups } from './topics.ts';
import type { QuizQuestion } from '@educatr/shared';

export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => topicGroups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    topicIdx: index('quizzes_topic_idx').on(t.topicId),
    groupIdx: index('quizzes_group_idx').on(t.groupId),
  }),
);

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    data: jsonb('data').$type<QuizQuestion>().notNull(),
  },
  (t) => ({
    quizIdx: index('quiz_questions_quiz_idx').on(t.quizId, t.position),
  }),
);
