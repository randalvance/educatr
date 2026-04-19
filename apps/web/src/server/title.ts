import { z } from 'zod';
import { extract } from '@educatr/ai';
import { updateChatTitle } from './chats.ts';
import { TITLE_SYSTEM_PROMPT } from './prompts.ts';

const TitleSchema = z.object({ title: z.string().min(1).max(80) });

/**
 * Auto-generate a short title from the first user/assistant exchange and persist it.
 * Swallows its own errors — a missing title never breaks the chat.
 */
export async function generateChatTitle(input: {
  chatId: string;
  userId: string;
  firstUserMessage: string;
  firstAssistantMessage: string;
}): Promise<void> {
  try {
    const result = await extract({
      schema: TitleSchema,
      schemaDescription: '{"title": "A 2-6 word Title Case summary"}',
      messages: [
        { role: 'system', content: TITLE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `User: ${input.firstUserMessage}\n\nAssistant: ${input.firstAssistantMessage}`,
        },
      ],
    });
    await updateChatTitle(input.chatId, input.userId, result.title.trim());
  } catch (err) {
    console.warn('[educatr] title generation failed:', err);
  }
}
