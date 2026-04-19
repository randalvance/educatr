import { createFileRoute } from '@tanstack/react-router';
import { SendMessageInput } from '@educatr/shared';
import { streamChat, AIStreamError } from '@educatr/ai';
import { getChatWithMessages, insertMessage } from '../server/chats.ts';
import { CHAT_SYSTEM_PROMPT } from '../server/prompts.ts';
import { generateChatTitle } from '../server/title.ts';
import { readUserFromRequest } from '../server/user.ts';
import { extractTopicsFromTurn } from '../server/extraction.ts';

function sseEvent(data: string): Uint8Array {
  // Escape any newlines inside the payload to keep each `data:` line single-line.
  const safe = data.replace(/\r?\n/g, '\\n');
  return new TextEncoder().encode(`data: ${safe}\n\n`);
}

export const Route = createFileRoute('/api/chats/stream')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userId, setCookie } = readUserFromRequest(request);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }
        const parsed = SendMessageInput.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify(parsed.error.issues), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const { chatId, content } = parsed.data;

        // Authorisation + load prior history.
        const chat = await getChatWithMessages(chatId, userId);
        if (!chat) return new Response('Chat not found', { status: 404 });

        // Persist user message BEFORE streaming so partial/failed streams still
        // retain the question that triggered them.
        const userMessage = await insertMessage({
          chatId,
          userId,
          role: 'user',
          content,
        });

        const priorForLLM = [
          { role: 'system' as const, content: CHAT_SYSTEM_PROMPT },
          ...chat.messages.map((m) => ({
            role: m.role === 'system' ? ('system' as const) : (m.role as 'user' | 'assistant'),
            content: m.content,
          })),
          { role: 'user' as const, content },
        ];

        const isFirstTurn = chat.messages.length === 0;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let assistantText = '';
            const abort = new AbortController();
            // Client disconnect → abort upstream.
            request.signal.addEventListener('abort', () => abort.abort());

            try {
              for await (const token of streamChat({
                messages: priorForLLM,
                signal: abort.signal,
              })) {
                assistantText += token;
                controller.enqueue(sseEvent(token));
              }
            } catch (err) {
              if (err instanceof AIStreamError) {
                controller.enqueue(sseEvent(`\n[stream error: ${err.message}]`));
              } else if (!(err instanceof Error && err.name === 'AbortError')) {
                controller.enqueue(sseEvent(`\n[error]`));
              }
            } finally {
              // Always persist whatever we accumulated — partial responses included.
              let assistantMessageId: string | null = null;
              if (assistantText.length > 0) {
                try {
                  const assistantMessage = await insertMessage({
                    chatId,
                    userId,
                    role: 'assistant',
                    content: assistantText,
                  });
                  assistantMessageId = assistantMessage.id;
                } catch (e) {
                  console.error('[educatr] assistant persist failed:', e);
                }
              }
              // Auto-title after the first completed exchange.
              if (isFirstTurn && assistantText.length > 0) {
                await generateChatTitle({
                  chatId,
                  userId,
                  firstUserMessage: userMessage.content,
                  firstAssistantMessage: assistantText,
                });
              }
              // Topic extraction — non-blocking to rendered tokens (already flushed);
              // failures are swallowed inside the extractor so chat UX is never broken.
              if (assistantMessageId && assistantText.length > 0) {
                await extractTopicsFromTurn({
                  userId,
                  assistantMessageId,
                  userMessage: userMessage.content,
                  assistantMessage: assistantText,
                  priorContext: chat.messages,
                });
              }
              controller.close();
            }
          },
        });

        const headers = new Headers({
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        if (setCookie) headers.append('Set-Cookie', setCookie);
        return new Response(stream, { headers });
      },
    },
  },
});
