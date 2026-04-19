import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb, schema } from '@educatr/db';
import { extract } from '@educatr/ai';
import {
  type GenerateQuizInput,
  type Quiz,
  type QuizQuestion,
  QuizGeneration,
} from '@educatr/shared';

const { topics, topicGroups, quizzes, quizQuestions } = schema;

const QUIZ_SYSTEM_PROMPT = `You write quizzes that test understanding of a specific lesson.

Rules:
- Return ONLY a JSON object: {"title": string, "questions": QuizQuestion[]}.
- Each question has one of three types:
  - {"type": "multiple_choice", "prompt": string, "choices": string[2..6], "correctIndex": number, "explanation"?: string}
  - {"type": "true_false", "prompt": string, "correctAnswer": boolean, "explanation"?: string}
  - {"type": "short_answer", "prompt": string, "acceptedAnswers": string[1..], "explanation"?: string}
- Mix question types. Prefer clarity over cleverness.
- For multiple_choice, correctIndex must be 0-based and point at the correct choice.
- Distractors must be plausible, not silly.
- Short answer "acceptedAnswers" should cover common phrasings (2–4 entries).
- Explanations are brief (one sentence) and reinforce the lesson.`;

type QuizRow = typeof quizzes.$inferSelect;
type QuizQuestionRow = typeof quizQuestions.$inferSelect;

function assembleQuiz(quiz: QuizRow, questionRows: QuizQuestionRow[]): Quiz {
  return {
    id: quiz.id,
    userId: quiz.userId,
    topicId: quiz.topicId ?? null,
    groupId: quiz.groupId ?? null,
    title: quiz.title,
    questions: questionRows
      .sort((a, b) => a.position - b.position)
      .map((q) => q.data),
    createdAt: quiz.createdAt.toISOString(),
  };
}

export async function generateQuiz(
  userId: string,
  input: GenerateQuizInput,
): Promise<Quiz> {
  if (!input.topicId && !input.groupId) {
    throw new Error('Either topicId or groupId is required');
  }

  const db = getDb();
  const sourceMaterial = input.topicId
    ? await loadTopicMaterial(input.topicId, userId)
    : await loadGroupMaterial(input.groupId!, userId);

  const result = await extract({
    schema: QuizGeneration,
    schemaDescription:
      '{"title": string, "questions": [QuizQuestion]}. Types: multiple_choice | true_false | short_answer.',
    messages: [
      { role: 'system', content: QUIZ_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `Produce a quiz with exactly ${input.questionCount} questions on this material.`,
          '',
          sourceMaterial,
        ].join('\n'),
      },
    ],
  });

  const [row] = await db
    .insert(quizzes)
    .values({
      userId,
      topicId: input.topicId ?? null,
      groupId: input.groupId ?? null,
      title: result.title,
    })
    .returning();
  if (!row) throw new Error('Failed to insert quiz');

  const questionRows = await db
    .insert(quizQuestions)
    .values(
      result.questions.map((q, i) => ({
        quizId: row.id,
        position: i,
        data: q,
      })),
    )
    .returning();

  return assembleQuiz(row, questionRows);
}

async function loadTopicMaterial(topicId: string, userId: string): Promise<string> {
  const db = getDb();
  const [t] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
    .limit(1);
  if (!t) throw new Error('Topic not found');
  return [`# ${t.title}`, t.summary, '', t.bodyMarkdown].join('\n');
}

async function loadGroupMaterial(groupId: string, userId: string): Promise<string> {
  const db = getDb();
  const [g] = await db
    .select()
    .from(topicGroups)
    .where(and(eq(topicGroups.id, groupId), eq(topicGroups.userId, userId)))
    .limit(1);
  if (!g) throw new Error('Topic group not found');
  const members = await db
    .select()
    .from(topics)
    .where(and(eq(topics.groupId, groupId), eq(topics.userId, userId)));
  return [
    `# ${g.title}`,
    g.summary,
    '',
    ...members.map((t) => [`## ${t.title}`, t.summary, '', t.bodyMarkdown].join('\n')),
  ].join('\n\n');
}

export async function listQuizzesForScope(
  userId: string,
  scope: { topicId?: string | undefined; groupId?: string | undefined },
): Promise<Quiz[]> {
  if (!scope.topicId && !scope.groupId) return [];
  const db = getDb();

  const whereClause = and(
    eq(quizzes.userId, userId),
    scope.topicId && scope.groupId
      ? or(eq(quizzes.topicId, scope.topicId), eq(quizzes.groupId, scope.groupId))
      : scope.topicId
        ? eq(quizzes.topicId, scope.topicId)
        : eq(quizzes.groupId, scope.groupId!),
  );

  const quizRows = await db
    .select()
    .from(quizzes)
    .where(whereClause)
    .orderBy(desc(quizzes.createdAt));
  if (quizRows.length === 0) return [];

  const allQuestions = await db
    .select()
    .from(quizQuestions)
    .where(
      inArray(
        quizQuestions.quizId,
        quizRows.map((q) => q.id),
      ),
    )
    .orderBy(asc(quizQuestions.position));

  const byQuiz = new Map<string, QuizQuestionRow[]>();
  for (const q of allQuestions) {
    const arr = byQuiz.get(q.quizId) ?? [];
    arr.push(q);
    byQuiz.set(q.quizId, arr);
  }
  return quizRows.map((q) => assembleQuiz(q, byQuiz.get(q.id) ?? []));
}

export async function getQuiz(quizId: string, userId: string): Promise<Quiz | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .limit(1);
  if (!row) return null;
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.position));
  return assembleQuiz(row, questions);
}

export function gradeQuiz(
  questions: QuizQuestion[],
  answers: Array<string | number | boolean | null>,
): { correct: number; total: number; results: Array<{ correct: boolean; explanation?: string }> } {
  const results = questions.map((q, i) => {
    const a = answers[i];
    let correct = false;
    switch (q.type) {
      case 'multiple_choice':
        correct = typeof a === 'number' && a === q.correctIndex;
        break;
      case 'true_false':
        correct = typeof a === 'boolean' && a === q.correctAnswer;
        break;
      case 'short_answer': {
        const normalized = typeof a === 'string' ? a.trim().toLowerCase() : '';
        correct = q.acceptedAnswers.some((acc) => acc.trim().toLowerCase() === normalized);
        break;
      }
    }
    return q.explanation ? { correct, explanation: q.explanation } : { correct };
  });
  const correct = results.filter((r) => r.correct).length;
  return { correct, total: questions.length, results };
}
