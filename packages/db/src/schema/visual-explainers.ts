import { pgTable, text, timestamp, uuid, integer, index } from 'drizzle-orm/pg-core';
import { topics } from './topics.ts';

export const visualExplainers = pgTable(
  'visual_explainers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    diagramSource: text('diagram_source').notNull(),
    narrativeMarkdown: text('narrative_markdown').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    topicIdx: index('visual_explainers_topic_idx').on(t.topicId, t.version),
  }),
);
