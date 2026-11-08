import type { Actor, ForumQuestion, ForumReply, QuestionInput } from "./types";

export const LIMITS = {
  titleMin: 5,
  titleMax: 150,
  contentMin: 10,
  contentMax: 5000,
  replyMin: 1,
  replyMax: 2000,
} as const;

/**
 * Nettoie un texte saisi : retire les caractères de contrôle invisibles
 * (on garde retours à la ligne et tabulations) et les espaces en bord.
 * L'échappement HTML est assuré par React à l'affichage.
 */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export function validateTitle(value: unknown): string | null {
  const title = cleanText(value);
  if (!title) return "Le titre est obligatoire.";
  if (title.length < LIMITS.titleMin)
    return `Le titre doit contenir au moins ${LIMITS.titleMin} caractères.`;
  if (title.length > LIMITS.titleMax)
    return `Le titre ne doit pas dépasser ${LIMITS.titleMax} caractères.`;
  return null;
}

export function validateContent(value: unknown): string | null {
  const content = cleanText(value);
  if (!content) return "La question est obligatoire.";
  if (content.length < LIMITS.contentMin)
    return `La question doit contenir au moins ${LIMITS.contentMin} caractères.`;
  if (content.length > LIMITS.contentMax)
    return `La question ne doit pas dépasser ${LIMITS.contentMax} caractères.`;
  return null;
}

export function validateQuestion(input: Partial<QuestionInput>): string[] {
  return [validateTitle(input.title), validateContent(input.content)].filter(
    (e): e is string => e !== null,
  );
}

export function validateReply(content: unknown): string[] {
  const text = cleanText(content);
  if (text.length < LIMITS.replyMin) return ["La réponse ne peut pas être vide."];
  if (text.length > LIMITS.replyMax)
    return [`La réponse ne doit pas dépasser ${LIMITS.replyMax} caractères.`];
  return [];
}

// --- Permissions & Clôture ------------------------------------------------
// Les patients posent les questions ; patients et médecins répondent.
// RÈGLE MÉTIER : Dès qu'un médecin répond à une question, celle-ci est automatiquement
// clôturée et PERSONNE (ni patient, ni autre médecin) ne peut répondre après la réponse du médecin.

export const canAskQuestion = (actor: Actor) => actor.role === "PATIENT";

export const isQuestionClosed = (
  q?: ForumQuestion | null,
  replies?: ForumReply[]
): boolean => {
  if (!q) return false;
  if (q.isClosed) return true;
  if (replies && replies.some((r) => r.author_role === "DOCTOR")) return true;
  return false;
};

export const canReply = (
  actor: Actor,
  question?: ForumQuestion | null,
  replies?: ForumReply[]
) => {
  if (question && isQuestionClosed(question, replies)) return false;
  return actor.role === "PATIENT" || actor.role === "DOCTOR";
};

const isModerator = (actor: Actor) => actor.role === "DOCTOR";

export const canEditQuestion = (q: ForumQuestion, actor: Actor) =>
  q.author_id === actor.id && !q.isClosed;

export const canDeleteQuestion = (q: ForumQuestion, actor: Actor) =>
  q.author_id === actor.id || isModerator(actor);

export const canEditReply = (r: ForumReply, actor: Actor) => r.author_id === actor.id;

export const canDeleteReply = (r: ForumReply, actor: Actor) =>
  r.author_id === actor.id || isModerator(actor);
