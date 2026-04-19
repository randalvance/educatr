import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@educatr/db';
import type { Chat, ChatWithMessages, Message } from '@educatr/shared';
import { serializeChat, serializeChatWithMessages, serializeMessage } from './serialize.ts';

const { chats, messages } = schema;

export async function listChatsForUser(userId: string): Promise<Chat[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
  return rows.map(serializeChat);
}

export async function getChatWithMessages(
  chatId: string,
  userId: string,
): Promise<ChatWithMessages | null> {
  const db = getDb();
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);
  if (!chat) return null;
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
  return serializeChatWithMessages(chat, msgs);
}

export async function createEmptyChat(userId: string): Promise<Chat> {
  const db = getDb();
  const [row] = await db
    .insert(chats)
    .values({ userId, title: null })
    .returning();
  if (!row) throw new Error('Failed to create chat');
  return serializeChat(row);
}

export async function insertMessage(input: {
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}): Promise<Message> {
  const db = getDb();
  const [row] = await db
    .insert(messages)
    .values({
      chatId: input.chatId,
      userId: input.userId,
      role: input.role,
      content: input.content,
    })
    .returning();
  if (!row) throw new Error('Failed to insert message');
  // Touch parent chat's updatedAt so sidebar ordering reflects recent activity.
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, input.chatId));
  return serializeMessage(row);
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(chats)
    .set({ title })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
}

export async function getPriorMessages(chatId: string): Promise<Message[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
  return rows.map(serializeMessage);
}
