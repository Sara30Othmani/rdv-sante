import type { Actor, ForumQuestion, ForumReply, QuestionInput } from "./types";

export const LIMITS = {
  titleMin: 5,
  titleMax: 150,
  contentMin: 10,
  contentMax: 5000,
  replyMin: 1,
  replyMax: 2000,
  /** Réponse de l'IA : un peu plus longue qu'une réponse d'utilisateur. */
  aiReplyMax: 4000,
  /** Photo déjà réduite (data URL) : environ 1,5 Mo d'image au maximum. */
  photoMaxChars: 2_000_000,
  /** Fichier choisi par l'utilisateur, avant réduction. */
  photoFileMaxBytes: 10 * 1024 * 1024,
} as const;

/** Formats d'image acceptés à l'import. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Auteur affiché pour la réponse de l'IA (toujours la première réponse). */
export const AI_AUTHOR = { id: "assistant-ia", name: "Assistant IA" } as const;

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
  return [validateTitle(input.title), validateContent(input.content), validatePhoto(input.photo)].filter(
    (e): e is string => e !== null,
  );
}

/** La photo est facultative ; si elle est fournie, ce doit être une image encodée. */
export function validatePhoto(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))
    return "La photo doit être une image JPEG, PNG ou WebP.";
  if (value.length > LIMITS.photoMaxChars) return "La photo est trop volumineuse.";
  return null;
}

export function validateReply(content: unknown): string[] {
  const text = cleanText(content);
  if (text.length < LIMITS.replyMin) return ["La réponse ne peut pas être vide."];
  if (text.length > LIMITS.replyMax)
    return [`La réponse ne doit pas dépasser ${LIMITS.replyMax} caractères.`];
  return [];
}

// --- Permissions -----------------------------------------------------------
// Les patients posent les questions ; patients et médecins répondent.
// Seul l'auteur modifie son contenu. Il n'y a pas d'administrateur dans
// l'application : la modération (suppression) revient aux médecins, comme
// prévu pour models/ForumReport.ts.

export const canAskQuestion = (actor: Actor) => actor.role === "PATIENT";

export const canReply = (actor: Actor) =>
  actor.role === "PATIENT" || actor.role === "DOCTOR";

const isModerator = (actor: Actor) => actor.role === "DOCTOR";

export const canEditQuestion = (q: ForumQuestion, actor: Actor) =>
  q.author_id === actor.id;

export const canDeleteQuestion = (q: ForumQuestion, actor: Actor) =>
  q.author_id === actor.id || isModerator(actor);

export const isAiReply = (r: ForumReply) => r.author_role === "AI";

// La réponse de l'IA n'est modifiable par personne (son auteur n'est pas un utilisateur).
export const canEditReply = (r: ForumReply, actor: Actor) =>
  !isAiReply(r) && r.author_id === actor.id;

/** Seul l'auteur de la question lance (ou relance) l'analyse de sa photo. */
export const canRequestAiAnalysis = (q: ForumQuestion, actor: Actor) =>
  !!q.photo && q.author_id === actor.id;

export const canDeleteReply = (r: ForumReply, actor: Actor) =>
  r.author_id === actor.id || isModerator(actor);
