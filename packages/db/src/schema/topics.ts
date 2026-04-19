import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  primaryKey,
  customType,
  jsonb,
} from 'drizzle-orm/pg-core';
import { messages } from './chats.ts';

const EMBEDDING_DIM = 1536;

/** Minimal pgvector custom type — stored as `vector(1536)` in Postgres. */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${EMBEDDING_DIM})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => Number(s));
  },
});

export const topicGroups = pgTable('topic_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary').notNull().default(''),
    bodyMarkdown: text('body_markdown').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    embedding: vector('embedding'),
    groupId: uuid('group_id').references(() => topicGroups.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSlugUnique: index('topics_user_slug_idx').on(t.userId, t.slug),
    // IVFFlat index on embedding — created via raw SQL in the migration.
    embeddingIdx: index('topics_embedding_idx').using(
      'ivfflat',
      sql`${t.embedding} vector_cosine_ops`,
    ),
  }),
);

/** Many-to-many: which chat messages produced or updated a given Topic. */
export const topicSources = pgTable(
  'topic_sources',
  {
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.topicId, t.messageId] }),
  }),
);
