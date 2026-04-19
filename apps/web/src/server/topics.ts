import { and, asc, desc, eq, sql, inArray } from 'drizzle-orm';
import { getDb, schema } from '@educatr/db';
import { embed, extract, EMBEDDING_DIMENSIONS } from '@educatr/ai';
import { z } from 'zod';
import type { Topic, TopicCandidate, TopicGroup } from '@educatr/shared';

const { topics, topicSources, topicGroups, messages } = schema;

const DEDUP_THRESHOLD = Number(process.env.TOPIC_DEDUP_THRESHOLD ?? '0.15');
const RELATED_THRESHOLD = Number(process.env.TOPIC_RELATED_THRESHOLD ?? '0.35');

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'untitled'
  );
}

function toVectorLiteral(vec: number[]): string {
  if (vec.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding length ${vec.length} does not match expected ${EMBEDDING_DIMENSIONS}`,
    );
  }
  return `[${vec.join(',')}]`;
}

type TopicRow = typeof topics.$inferSelect;

function serializeTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    bodyMarkdown: row.bodyMarkdown,
    tags: row.tags,
    groupId: row.groupId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type TopicGroupRow = typeof topicGroups.$inferSelect;

function serializeTopicGroup(row: TopicGroupRow): TopicGroup {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Persist a candidate Topic with dedup:
 *  1. Slug match inside user scope → merge (link source only).
 *  2. Embedding cosine distance < DEDUP_THRESHOLD → merge (link source, optionally append body).
 *  3. Otherwise insert a new Topic with its embedding.
 */
export async function persistTopicCandidate(input: {
  userId: string;
  messageId: string;
  candidate: TopicCandidate;
}): Promise<{ topicId: string; merged: boolean }> {
  const db = getDb();
  const slug = slugify(input.candidate.title);

  // 1. Lexical pre-check.
  const [existing] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.userId, input.userId), eq(topics.slug, slug)))
    .limit(1);

  if (existing) {
    await linkSource(existing.id, input.messageId);
    await maybeAppendRevision(existing, input.candidate);
    return { topicId: existing.id, merged: true };
  }

  // 2. Embedding + semantic dedup.
  const embedding = await embed({ input: `${input.candidate.title}\n${input.candidate.summary}` });
  const embeddingLiteral = toVectorLiteral(embedding);

  const nearest = await db
    .select({
      id: topics.id,
      title: topics.title,
      summary: topics.summary,
      bodyMarkdown: topics.bodyMarkdown,
      distance: sql<number>`${topics.embedding} <=> ${embeddingLiteral}::vector`,
    })
    .from(topics)
    .where(eq(topics.userId, input.userId))
    .orderBy(sql`${topics.embedding} <=> ${embeddingLiteral}::vector`)
    .limit(1);

  const candidate = nearest[0];
  if (candidate && candidate.distance < DEDUP_THRESHOLD) {
    await linkSource(candidate.id, input.messageId);
    await maybeAppendRevision(
      {
        id: candidate.id,
        bodyMarkdown: candidate.bodyMarkdown,
      },
      input.candidate,
    );
    return { topicId: candidate.id, merged: true };
  }

  // 3. Fresh insert.
  const [inserted] = await db
    .insert(topics)
    .values({
      userId: input.userId,
      title: input.candidate.title,
      slug,
      summary: input.candidate.summary,
      bodyMarkdown: input.candidate.bodyMarkdown,
      tags: input.candidate.tags,
      embedding,
    })
    .returning({ id: topics.id });
  if (!inserted) throw new Error('Failed to insert topic');

  await linkSource(inserted.id, input.messageId);
  return { topicId: inserted.id, merged: false };
}

async function linkSource(topicId: string, messageId: string): Promise<void> {
  const db = getDb();
  await db.insert(topicSources).values({ topicId, messageId }).onConflictDoNothing();
}

/**
 * Append a new "note" section to an existing Topic if the candidate body covers
 * material not obviously already present. Heuristic: if the candidate body is
 * shorter than 40 chars OR a prefix/substring of the existing body, skip.
 */
async function maybeAppendRevision(
  existing: { id: string; bodyMarkdown?: string },
  candidate: TopicCandidate,
): Promise<void> {
  const body = candidate.bodyMarkdown.trim();
  if (body.length < 40) return;
  if (existing.bodyMarkdown && existing.bodyMarkdown.includes(body)) return;

  const db = getDb();
  const timestamp = new Date().toISOString().slice(0, 10);
  const appendix = `\n\n---\n\n### Note — ${timestamp}\n\n${body}`;
  await db
    .update(topics)
    .set({
      bodyMarkdown: sql`${topics.bodyMarkdown} || ${appendix}`,
      updatedAt: new Date(),
    })
    .where(eq(topics.id, existing.id));
}

// --- CRUD ---

export async function listTopicsForUser(userId: string): Promise<Topic[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(topics)
    .where(eq(topics.userId, userId))
    .orderBy(desc(topics.updatedAt));
  return rows.map(serializeTopic);
}

export async function getTopic(topicId: string, userId: string): Promise<Topic | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
    .limit(1);
  return row ? serializeTopic(row) : null;
}

export async function getTopicSources(
  topicId: string,
): Promise<Array<{ messageId: string; chatId: string; content: string; createdAt: string }>> {
  const db = getDb();
  const rows = await db
    .select({
      messageId: topicSources.messageId,
      chatId: messages.chatId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(topicSources)
    .innerJoin(messages, eq(topicSources.messageId, messages.id))
    .where(eq(topicSources.topicId, topicId))
    .orderBy(asc(messages.createdAt));
  return rows.map((r) => ({
    messageId: r.messageId,
    chatId: r.chatId,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  }));
}

export const UpdateTopicSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function updateTopic(
  userId: string,
  input: z.infer<typeof UpdateTopicSchema>,
): Promise<Topic> {
  const db = getDb();
  const patch: Partial<typeof topics.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) {
    patch.title = input.title;
    patch.slug = slugify(input.title);
  }
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.bodyMarkdown !== undefined) patch.bodyMarkdown = input.bodyMarkdown;
  if (input.tags !== undefined) patch.tags = input.tags;

  const [row] = await db
    .update(topics)
    .set(patch)
    .where(and(eq(topics.id, input.id), eq(topics.userId, userId)))
    .returning();
  if (!row) throw new Error('Topic not found');

  // If title changed, refresh the embedding so future dedup reflects the new identity.
  if (input.title !== undefined || input.summary !== undefined) {
    try {
      const embedding = await embed({ input: `${row.title}\n${row.summary}` });
      await db.update(topics).set({ embedding }).where(eq(topics.id, row.id));
    } catch (err) {
      console.warn('[educatr] embedding refresh failed:', err);
    }
  }
  return serializeTopic(row);
}

export async function deleteTopic(topicId: string, userId: string): Promise<void> {
  const db = getDb();
  await db.delete(topics).where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
}

// --- Grouping ---

const GROUP_LABEL_PROMPT = `You name a cluster of related learning topics.

Rules:
- Return ONLY a JSON object: {"title": string, "summary": string}.
- Title: 2–5 words, Title Case, no trailing punctuation.
- Summary: one sentence describing what unifies these topics.`;

const GroupLabelSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(240),
});

/**
 * Recompute Topic grouping for a user. Clusters ungrouped Topics whose pairwise
 * cosine distance is within RELATED_THRESHOLD. Each new cluster gets its own
 * TopicGroup, auto-labelled via a small AI call. Lazy / on-demand — not run
 * on every insert.
 */
export async function recomputeTopicGroups(userId: string): Promise<{ groupsCreated: number }> {
  const db = getDb();
  const rows = await db
    .select({
      id: topics.id,
      title: topics.title,
      summary: topics.summary,
      embedding: topics.embedding,
      groupId: topics.groupId,
    })
    .from(topics)
    .where(eq(topics.userId, userId));

  const ungrouped = rows.filter((r) => !r.groupId && r.embedding && r.embedding.length > 0);
  if (ungrouped.length < 2) return { groupsCreated: 0 };

  // Union-find over pairs within RELATED_THRESHOLD.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== (parent.get(p) ?? p)) p = parent.get(p) ?? p;
    parent.set(x, p);
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const r of ungrouped) parent.set(r.id, r.id);

  for (let i = 0; i < ungrouped.length; i++) {
    for (let j = i + 1; j < ungrouped.length; j++) {
      const a = ungrouped[i]!;
      const b = ungrouped[j]!;
      const d = cosineDistance(a.embedding!, b.embedding!);
      if (d < RELATED_THRESHOLD) union(a.id, b.id);
    }
  }

  const clusters = new Map<string, string[]>();
  for (const r of ungrouped) {
    const root = find(r.id);
    const arr = clusters.get(root) ?? [];
    arr.push(r.id);
    clusters.set(root, arr);
  }

  let groupsCreated = 0;
  for (const memberIds of clusters.values()) {
    if (memberIds.length < 2) continue;
    const members = ungrouped.filter((r) => memberIds.includes(r.id));
    const label = await labelCluster(members);
    const [group] = await db
      .insert(topicGroups)
      .values({ userId, title: label.title, summary: label.summary })
      .returning({ id: topicGroups.id });
    if (!group) continue;
    await db
      .update(topics)
      .set({ groupId: group.id })
      .where(and(eq(topics.userId, userId), inArray(topics.id, memberIds)));
    groupsCreated++;
  }

  return { groupsCreated };
}

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 1;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function labelCluster(
  members: Array<{ title: string; summary: string }>,
): Promise<z.infer<typeof GroupLabelSchema>> {
  try {
    return await extract({
      schema: GroupLabelSchema,
      schemaDescription: '{"title": string, "summary": string}',
      messages: [
        { role: 'system', content: GROUP_LABEL_PROMPT },
        {
          role: 'user',
          content: members
            .map((m) => `- ${m.title}: ${m.summary}`)
            .join('\n'),
        },
      ],
    });
  } catch {
    return { title: 'Related Topics', summary: 'A cluster of related lessons.' };
  }
}

export async function listTopicGroupsForUser(userId: string): Promise<TopicGroup[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(topicGroups)
    .where(eq(topicGroups.userId, userId))
    .orderBy(desc(topicGroups.createdAt));
  return rows.map(serializeTopicGroup);
}

export async function getTopicGroupWithTopics(
  groupId: string,
  userId: string,
): Promise<{ group: TopicGroup; topics: Topic[] } | null> {
  const db = getDb();
  const [group] = await db
    .select()
    .from(topicGroups)
    .where(and(eq(topicGroups.id, groupId), eq(topicGroups.userId, userId)))
    .limit(1);
  if (!group) return null;
  const members = await db
    .select()
    .from(topics)
    .where(and(eq(topics.groupId, groupId), eq(topics.userId, userId)))
    .orderBy(asc(topics.title));
  return { group: serializeTopicGroup(group), topics: members.map(serializeTopic) };
}
