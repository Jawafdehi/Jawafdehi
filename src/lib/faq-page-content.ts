export type FaqSnippetItem = {
  id: string;
  question: string;
  answers: string[];
};

export type FaqPageQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type FaqPageSection = {
  id: string;
  title: string;
  questions: FaqPageQuestion[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isFaqPageQuestion = (value: unknown): value is FaqPageQuestion =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.question === "string" &&
  typeof value.answer === "string";

export const isFaqPageSection = (value: unknown): value is FaqPageSection =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  Array.isArray(value.questions) &&
  value.questions.every(isFaqPageQuestion);

export const getFaqSnippetItems = (
  rawSections: unknown,
  questionIds: readonly string[],
): FaqSnippetItem[] => {
  if (!Array.isArray(rawSections)) return [];

  const questionsById = new Map<string, FaqPageQuestion>();
  rawSections.filter(isFaqPageSection).forEach((section) => {
    section.questions.forEach((question) => {
      questionsById.set(question.id, question);
    });
  });

  return questionIds.flatMap((questionId) => {
    const question = questionsById.get(questionId);

    return question
      ? [
          {
            id: question.id,
            question: question.question,
            answers: [question.answer],
          },
        ]
      : [];
  });
};
