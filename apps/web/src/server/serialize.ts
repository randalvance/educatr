import type { schema } from '@educatr/db';
import type { Chat, ChatWithMessages, Message } from '@educatr/shared';

type ChatRow = typeof schema.chats.$inferSelect;
type MessageRow = typeof schema.messages.$inferSelect;

export function serializeChat(row: ChatRow): Chat {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.chatId,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeChatWithMessages(
  chatRow: ChatRow,
  messageRows: MessageRow[],
): ChatWithMessages {
  return {
    ...serializeChat(chatRow),
    messages: messageRows.map(serializeMessage),
  };
}
