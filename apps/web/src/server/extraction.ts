import { extract } from '@educatr/ai';
import { TopicCandidateList, type Message } from '@educatr/shared';
import { persistTopicCandidate } from './topics.ts';

const EXTRACTION_SYSTEM_PROMPT = `You extract granular, standalone lessons ("topics") from a teacher-student exchange.

Rules:
- Return ONLY a JSON object of the form {"candidates": Topic[]}.
- Each Topic: {"title": string, "summary": string, "bodyMarkdown": string, "tags": string[]}.
- Each Topic must be narrow enough to stand alone as a single lesson. If the exchange covers multiple distinct concepts, produce multiple Topics — never one sprawling Topic.
- Return an empty candidates array if the exchange is small talk, a clarifying question, or otherwise has no new teachable content.
- Titles: 2–8 words, Title Case, no trailing punctuation.
- Summaries: 1–2 sentences, ≤ 300 chars.
- bodyMarkdown: a compact, well-structured lesson drawn from the exchange (not a transcript).
- Tags: 2–6 short lowercase keywords.`;

/**
 * Run the extractor over the just-completed turn. Non-blocking to the user-
 * visible stream (tokens are already flushed by the time this runs). Swallows
 * errors — extraction failures MUST NEVER break the chat.
 */
export async function extractTopicsFromTurn(input: {
  userId: string;
  assistantMessageId: string;
  userMessage: string;
  assistantMessage: string;
  priorContext: Message[];
}): Promise<void> {
  try {
    // Keep the prompt small — last ~2 messages of prior context is plenty.
    const priorBlock = input.priorContext
      .slice(-2)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const result = await extract({
      schema: TopicCandidateList,
      schemaDescription:
        '{"candidates": [{"title": string, "summary": string, "bodyMarkdown": string, "tags": string[]}]}',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            priorBlock ? `Prior context:\n${priorBlock}` : null,
            `Latest exchange:\nUSER: ${input.userMessage}\n\nASSISTANT: ${input.assistantMessage}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    });

    for (const candidate of result.candidates) {
      try {
        await persistTopicCandidate({
          userId: input.userId,
          messageId: input.assistantMessageId,
          candidate,
        });
      } catch (err) {
        console.warn('[educatr] topic persist failed:', err);
      }
    }
  } catch (err) {
    console.warn('[educatr] topic extraction failed:', err);
  }
}
