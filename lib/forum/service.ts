import { getDB } from "../db";
import type {
  Actor,
  ForumQuestion,
  ForumQuestionSummary,
  ForumReply,
  QuestionInput,
} from "./types";
import {
  AI_AUTHOR,
  canAskQuestion,
  canRequestAiAnalysis,
  isAiReply,
  LIMITS,
  canDeleteQuestion,
  canDeleteReply,
  canEditQuestion,
  canEditReply,
  canReply,
  cleanText,
  validateQuestion,
  validateReply,
} from "./rules";

// Toutes les écritures passent par ce service : il vérifie la session,
// les droits et la validation avant de toucher à la base. L'auteur est
// toujours pris dans la session, jamais dans les données envoyées.

export class ForumError extends Error {
  constructor(
    message: string,
    public code: "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "ForumError";
  }
}

function requireActor(actor: Actor | null | undefined): Actor {
  if (!actor?.id || !actor.role || !actor.name)
    throw new ForumError("Vous devez être connecté.", "UNAUTHENTICATED");
  return actor;
}

function assertValid(errors: string[]) {
  if (errors.length) throw new ForumError(errors.join("\n"), "VALIDATION");
}

const now = () => new Date().toISOString();

// --- Lecture ---------------------------------------------------------------

export async function listQuestions(): Promise<ForumQuestionSummary[]> {
  const db = await getDB();
  const [questions, replies] = await Promise.all([
    db.getAll("forumQuestions"),
    db.getAll("forumReplies"),
  ]);
  const byQuestion = new Map<string, ForumReply[]>();
  for (const r of replies) {
    const list = byQuestion.get(r.question_id) ?? [];
    list.push(r);
    byQuestion.set(r.question_id, list);
  }
  return questions
    .map((q) => {
      const list = byQuestion.get(q.id) ?? [];
      const lastReply = list.reduce<ForumReply | undefined>(
        (last, r) => (!last || r.created_at > last.created_at ? r : last),
        undefined,
      );
      return { ...q, replyCount: list.length, lastReply };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const getQuestion = async (id: string) =>
  (await getDB()).get("forumQuestions", id);

export async function listReplies(questionId: string): Promise<ForumReply[]> {
  const db = await getDB();
  const replies = await db.getAllFromIndex("forumReplies", "by-question", questionId);
  return sortReplies(replies);
}

/** Ordre du fil : la réponse de l'IA d'abord, puis les autres par date. */
export const sortReplies = (replies: ForumReply[]) =>
  [...replies].sort(
    (a, b) => Number(isAiReply(b)) - Number(isAiReply(a)) || a.created_at.localeCompare(b.created_at),
  );

// --- Questions -------------------------------------------------------------

export async function createQuestion(
  actor: Actor | null | undefined,
  input: Partial<QuestionInput>,
): Promise<ForumQuestion> {
  const user = requireActor(actor);
  if (!canAskQuestion(user))
    throw new ForumError("Seuls les patients peuvent poser une question.", "FORBIDDEN");
  assertValid(validateQuestion(input));

  const t = now();
  const question: ForumQuestion = {
    id: crypto.randomUUID(),
    author_id: user.id,
    author_name: user.name,
    author_role: user.role,
    title: cleanText(input.title),
    content: cleanText(input.content),
    created_at: t,
    updated_at: t,
    syncStatus: "pending",
  };
  if (input.photo) {
    question.photo = input.photo;
    question.ai_analysis = "pending";
  }
  await (await getDB()).add("forumQuestions", question);
  return question;
}

export async function updateQuestion(
  actor: Actor | null | undefined,
  id: string,
  input: Partial<QuestionInput>,
): Promise<ForumQuestion> {
  const user = requireActor(actor);
  const db = await getDB();
  const tx = db.transaction(["forumQuestions", "forumReplies", "deleted"], "readwrite");
  const store = tx.objectStore("forumQuestions");
  const old = await store.get(id);
  if (!old) throw new ForumError("Question introuvable.", "NOT_FOUND");
  if (!canEditQuestion(old, user))
    throw new ForumError("Vous ne pouvez modifier que vos propres questions.", "FORBIDDEN");
  assertValid(validateQuestion(input));

  // Seuls le titre, le contenu et la photo sont modifiables : id, auteur et
  // date de création viennent de l'enregistrement existant.
  const next: ForumQuestion = {
    ...old,
    title: cleanText(input.title),
    content: cleanText(input.content),
    updated_at: now(),
    syncStatus: "pending",
  };

  // Photo : `undefined` = inchangée. Nouvelle photo ou photo retirée : la
  // réponse de l'IA ne correspond plus, elle est supprimée (et refaite si
  // une nouvelle photo est jointe).
  const photo = input.photo === undefined ? old.photo : input.photo || undefined;
  if (photo !== old.photo) {
    const replies = tx.objectStore("forumReplies");
    const aiReplies = (await replies.index("by-question").getAll(id)).filter(isAiReply);
    await Promise.all(
      aiReplies.flatMap((r) => [replies.delete(r.id), tx.objectStore("deleted").put({ id: r.id })]),
    );
    if (photo) {
      next.photo = photo;
      next.ai_analysis = "pending";
    } else {
      delete next.photo;
      delete next.ai_analysis;
    }
  }
  await store.put(next);
  await tx.done;
  return next;
}

/** Supprime la question et toutes ses réponses dans une seule transaction. */
export async function deleteQuestion(actor: Actor | null | undefined, id: string) {
  const user = requireActor(actor);
  const db = await getDB();
  const tx = db.transaction(["forumQuestions", "forumReplies", "deleted"], "readwrite");
  const question = await tx.objectStore("forumQuestions").get(id);
  if (!question) throw new ForumError("Question introuvable.", "NOT_FOUND");
  if (!canDeleteQuestion(question, user))
    throw new ForumError("Vous ne pouvez pas supprimer cette question.", "FORBIDDEN");

  const replies = tx.objectStore("forumReplies");
  const replyIds = await replies.index("by-question").getAllKeys(id);
  const deleted = tx.objectStore("deleted");
  await Promise.all([
    ...replyIds.map((rid) => replies.delete(rid)),
    ...replyIds.map((rid) => deleted.put({ id: rid })),
    tx.objectStore("forumQuestions").delete(id),
    deleted.put({ id }),
  ]);
  await tx.done;
}

// --- Réponses --------------------------------------------------------------

export async function createReply(
  actor: Actor | null | undefined,
  questionId: string,
  content: unknown,
): Promise<ForumReply> {
  const user = requireActor(actor);
  if (!canReply(user))
    throw new ForumError("Vous ne pouvez pas répondre à cette question.", "FORBIDDEN");
  assertValid(validateReply(content));

  const db = await getDB();
  // La question est relue dans la même transaction : pas de réponse
  // orpheline si elle a été supprimée entre-temps.
  const tx = db.transaction(["forumQuestions", "forumReplies"], "readwrite");
  const question = await tx.objectStore("forumQuestions").get(questionId);
  if (!question) throw new ForumError("Question introuvable.", "NOT_FOUND");

  const t = now();
  const reply: ForumReply = {
    id: crypto.randomUUID(),
    question_id: question.id,
    author_id: user.id,
    author_name: user.name,
    author_role: user.role,
    content: cleanText(content),
    created_at: t,
    updated_at: t,
    syncStatus: "pending",
  };
  await tx.objectStore("forumReplies").add(reply);
  await tx.done;
  return reply;
}

export async function updateReply(
  actor: Actor | null | undefined,
  id: string,
  content: unknown,
): Promise<ForumReply> {
  const user = requireActor(actor);
  const db = await getDB();
  const tx = db.transaction("forumReplies", "readwrite");
  const old = await tx.store.get(id);
  if (!old) throw new ForumError("Réponse introuvable.", "NOT_FOUND");
  if (!canEditReply(old, user))
    throw new ForumError("Vous ne pouvez modifier que vos propres réponses.", "FORBIDDEN");
  assertValid(validateReply(content));

  const next: ForumReply = {
    ...old,
    content: cleanText(content),
    updated_at: now(),
    syncStatus: "pending",
  };
  await tx.store.put(next);
  await tx.done;
  return next;
}

export async function deleteReply(actor: Actor | null | undefined, id: string) {
  const user = requireActor(actor);
  const db = await getDB();
  const tx = db.transaction(["forumReplies", "deleted"], "readwrite");
  const reply = await tx.objectStore("forumReplies").get(id);
  if (!reply) throw new ForumError("Réponse introuvable.", "NOT_FOUND");
  if (!canDeleteReply(reply, user))
    throw new ForumError("Vous ne pouvez pas supprimer cette réponse.", "FORBIDDEN");
  await Promise.all([
    tx.objectStore("forumReplies").delete(id),
    tx.objectStore("deleted").put({ id }),
  ]);
  await tx.done;
}

// --- Analyse de la photo par l'IA -------------------------------------------
// L'appel au modèle se fait côté serveur (/api/forum/analyze-photo, la clé
// d'API n'est jamais envoyée au navigateur) ; ces fonctions enregistrent le
// résultat localement, comme les autres réponses.

function requireAiAccess(question: ForumQuestion | undefined, actor: Actor) {
  if (!question) throw new ForumError("Question introuvable.", "NOT_FOUND");
  if (!canRequestAiAnalysis(question, actor))
    throw new ForumError("Seul l'auteur de la question peut demander l'analyse de sa photo.", "FORBIDDEN");
  return question;
}

/**
 * Enregistre la réponse de l'IA comme première réponse de la question.
 * Remplace une éventuelle réponse précédente de l'IA.
 */
export async function saveAiReply(
  actor: Actor | null | undefined,
  questionId: string,
  content: unknown,
): Promise<ForumReply> {
  const user = requireActor(actor);
  const text = cleanText(content).slice(0, LIMITS.aiReplyMax);
  if (!text) throw new ForumError("L'analyse de l'IA est vide.", "VALIDATION");

  const db = await getDB();
  const tx = db.transaction(["forumQuestions", "forumReplies"], "readwrite");
  const questions = tx.objectStore("forumQuestions");
  const question = requireAiAccess(await questions.get(questionId), user);

  const replies = tx.objectStore("forumReplies");
  const previous = (await replies.index("by-question").getAll(questionId)).filter(isAiReply);
  await Promise.all(previous.map((r) => replies.delete(r.id)));

  const t = now();
  const reply: ForumReply = {
    id: crypto.randomUUID(),
    question_id: question.id,
    author_id: AI_AUTHOR.id,
    author_name: AI_AUTHOR.name,
    author_role: "AI",
    content: text,
    created_at: t,
    updated_at: t,
    syncStatus: "pending",
  };
  await replies.add(reply);
  await questions.put({ ...question, ai_analysis: "done" });
  await tx.done;
  return reply;
}

/** Marque l'analyse comme échouée (l'auteur pourra la relancer). */
export async function markAiAnalysisFailed(actor: Actor | null | undefined, questionId: string) {
  const user = requireActor(actor);
  const db = await getDB();
  const tx = db.transaction("forumQuestions", "readwrite");
  const question = requireAiAccess(await tx.store.get(questionId), user);
  const next: ForumQuestion = { ...question, ai_analysis: "failed" };
  await tx.store.put(next);
  await tx.done;
  return next;
}

// --- Synchronisation (simulée, comme pour les feedbacks) --------------------

export async function syncPendingForum() {
  const db = await getDB();
  const tx = db.transaction(["forumQuestions", "forumReplies"], "readwrite");
  const questions = tx.objectStore("forumQuestions");
  const replies = tx.objectStore("forumReplies");
  const [qs, rs] = await Promise.all([questions.getAll(), replies.getAll()]);
  await Promise.all([
    ...qs.filter((q) => q.syncStatus === "pending")
      .map((q) => questions.put({ ...q, syncStatus: "synced" })),
    ...rs.filter((r) => r.syncStatus === "pending")
      .map((r) => replies.put({ ...r, syncStatus: "synced" })),
  ]);
  await tx.done;
}

// --- Données de démo au premier lancement ------------------------------------

export async function seedForumIfEmpty() {
  const db = await getDB();
  const tx = db.transaction(["forumQuestions", "forumReplies"], "readwrite");
  if ((await tx.objectStore("forumQuestions").count()) > 0) {
    await tx.done;
    return;
  }
  const t = now();
  const base = { created_at: t, updated_at: t, syncStatus: "synced" as const };
  await tx.objectStore("forumQuestions").put({
    ...base,
    id: "forum-demo1",
    author_id: "demo-patient",
    author_name: "Ahmed Mansour",
    author_role: "PATIENT",
    title: "Comment préparer une première consultation ?",
    content:
      "Je vais voir un cardiologue pour la première fois. Quels documents faut-il apporter au rendez-vous ?",
  });
  await tx.objectStore("forumReplies").put({
    ...base,
    id: "forum-demo1-r1",
    question_id: "forum-demo1",
    author_id: "demo-doctor",
    author_name: "Dr. Amel Ben Salem",
    author_role: "DOCTOR",
    content:
      "Apportez votre carte de soins, vos ordonnances en cours et vos derniers résultats d'analyses. Notez aussi vos questions à l'avance.",
  });
  await tx.done;
}
