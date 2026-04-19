import { z } from 'zod';

export const MessageRole = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRole>;

export const Message = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  role: MessageRole,
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof Message>;

export const Chat = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Chat = z.infer<typeof Chat>;

export const ChatWithMessages = Chat.extend({
  messages: z.array(Message),
});
export type ChatWithMessages = z.infer<typeof ChatWithMessages>;

export const CreateChatInput = z.object({
  firstMessage: z.string().min(1),
});
export type CreateChatInput = z.infer<typeof CreateChatInput>;

export const SendMessageInput = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1),
});
export type SendMessageInput = z.infer<typeof SendMessageInput>;
