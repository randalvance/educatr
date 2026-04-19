import { z } from 'zod';
import {
  Chat,
  ChatWithMessages,
  type CreateChatInput,
  type SendMessageInput,
} from '../schemas/chat.ts';
import {
  Topic,
  TopicGroup,
  type UpdateTopicInput,
} from '../schemas/topic.ts';
import { Quiz, type GenerateQuizInput } from '../schemas/quiz.ts';
import {
  FlashcardDeck,
  FlashcardDeckWithCards,
  type GenerateFlashcardsInput,
} from '../schemas/flashcard.ts';
import { VisualExplainer } from '../schemas/visual-explainer.ts';
import { streamSse, type StreamSseOptions } from './sse.ts';

export interface ApiClientConfig {
  /** Base URL of the web API (e.g. `https://educatr.example` or `http://localhost:3000`). */
  baseUrl: string;
  /** Optional default headers (e.g. device-scoped user id for the mobile client). */
  headers?: Record<string, string>;
  /** Override for `fetch` — useful for injecting `expo/fetch` in React Native. */
  fetch?: typeof fetch;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, headers: defaultHeaders = {}, fetch: fetchImpl = fetch } = config;

  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`;

  async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(url(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${init?.method ?? 'GET'} ${path} failed ${res.status}: ${text}`);
    }
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  return {
    // --- Chats ---
    listChats: () => request('/api/chats', z.array(Chat)),
    getChat: (id: string) => request(`/api/chats/${id}`, ChatWithMessages),
    createChat: (input: CreateChatInput) =>
      request('/api/chats', Chat, { method: 'POST', body: JSON.stringify(input) }),

    /**
     * Open an SSE stream for a chat turn. Yields token chunks until the server closes
     * the stream. The server is responsible for persisting the user message and the
     * accumulated assistant response.
     */
    streamChatMessage: (input: SendMessageInput, signal?: AbortSignal) => {
      const opts: StreamSseOptions = {
        url: url('/api/chats/stream'),
        method: 'POST',
        headers: defaultHeaders,
        body: input,
      };
      if (signal) opts.signal = signal;
      return streamSse(opts);
    },

    // --- Topics ---
    listTopics: () => request('/api/topics', z.array(Topic)),
    getTopic: (id: string) => request(`/api/topics/${id}`, Topic),
    updateTopic: (input: UpdateTopicInput) =>
      request(`/api/topics/${input.id}`, Topic, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteTopic: (id: string) =>
      request(`/api/topics/${id}`, z.object({ ok: z.literal(true) }), { method: 'DELETE' }),

    // --- Topic groups ---
    listTopicGroups: () => request('/api/topic-groups', z.array(TopicGroup)),
    getTopicGroup: (id: string) =>
      request(
        `/api/topic-groups/${id}`,
        TopicGroup.extend({ topics: z.array(Topic) }),
      ),

    // --- Quizzes ---
    listQuizzes: (params: { topicId?: string; groupId?: string }) => {
      const qs = new URLSearchParams();
      if (params.topicId) qs.set('topicId', params.topicId);
      if (params.groupId) qs.set('groupId', params.groupId);
      return request(`/api/quizzes?${qs.toString()}`, z.array(Quiz));
    },
    generateQuiz: (input: GenerateQuizInput) =>
      request('/api/quizzes/generate', Quiz, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    // --- Flashcards ---
    listFlashcardDecks: (params: { topicId?: string; groupId?: string }) => {
      const qs = new URLSearchParams();
      if (params.topicId) qs.set('topicId', params.topicId);
      if (params.groupId) qs.set('groupId', params.groupId);
      return request(`/api/flashcard-decks?${qs.toString()}`, z.array(FlashcardDeck));
    },
    getFlashcardDeck: (id: string) =>
      request(`/api/flashcard-decks/${id}`, FlashcardDeckWithCards),
    generateFlashcards: (input: GenerateFlashcardsInput) =>
      request('/api/flashcard-decks/generate', FlashcardDeck, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    // --- Visual explainers ---
    listVisualExplainers: (topicId: string) =>
      request(`/api/visual-explainers?topicId=${topicId}`, z.array(VisualExplainer)),
    generateVisualExplainer: (topicId: string) =>
      request('/api/visual-explainers/generate', VisualExplainer, {
        method: 'POST',
        body: JSON.stringify({ topicId }),
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
