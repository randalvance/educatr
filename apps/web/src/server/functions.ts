import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { GenerateQuizInput } from '@educatr/shared';
import {
  createEmptyChat,
  getChatWithMessages,
  listChatsForUser,
} from './chats.ts';
import { generateQuiz, getQuiz, listQuizzesForScope } from './quizzes.ts';
import {
  deleteTopic,
  getTopic,
  getTopicGroupWithTopics,
  getTopicSources,
  listTopicGroupsForUser,
  listTopicsForUser,
  recomputeTopicGroups,
  updateTopic,
  UpdateTopicSchema,
} from './topics.ts';
import { getOrCreateUserId } from './user.ts';

export const listChatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = getOrCreateUserId();
  return listChatsForUser(userId);
});

export const getChatFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ chatId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    const chat = await getChatWithMessages(data.chatId, userId);
    if (!chat) throw new Error('Chat not found');
    return chat;
  });

export const createChatFn = createServerFn({ method: 'POST' }).handler(async () => {
  const userId = getOrCreateUserId();
  return createEmptyChat(userId);
});

// --- Topics ---

export const listTopicsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = getOrCreateUserId();
  return listTopicsForUser(userId);
});

export const getTopicFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ topicId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    const topic = await getTopic(data.topicId, userId);
    if (!topic) throw new Error('Topic not found');
    const sources = await getTopicSources(topic.id);
    return { topic, sources };
  });

export const updateTopicFn = createServerFn({ method: 'POST' })
  .inputValidator(UpdateTopicSchema)
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    return updateTopic(userId, data);
  });

export const deleteTopicFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ topicId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    await deleteTopic(data.topicId, userId);
    return { ok: true as const };
  });

// --- Topic groups ---

export const listTopicGroupsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = getOrCreateUserId();
  return listTopicGroupsForUser(userId);
});

export const getTopicGroupFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ groupId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    const result = await getTopicGroupWithTopics(data.groupId, userId);
    if (!result) throw new Error('Topic group not found');
    return result;
  });

export const recomputeGroupsFn = createServerFn({ method: 'POST' }).handler(async () => {
  const userId = getOrCreateUserId();
  return recomputeTopicGroups(userId);
});

// --- Quizzes ---

export const generateQuizFn = createServerFn({ method: 'POST' })
  .inputValidator(GenerateQuizInput)
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    return generateQuiz(userId, data);
  });

export const listQuizzesFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      topicId: z.string().uuid().optional(),
      groupId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    return listQuizzesForScope(userId, data);
  });

export const getQuizFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ quizId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = getOrCreateUserId();
    const quiz = await getQuiz(data.quizId, userId);
    if (!quiz) throw new Error('Quiz not found');
    return quiz;
  });
