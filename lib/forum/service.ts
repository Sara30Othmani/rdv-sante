import { getDB } from "../db";
import type {
  Actor,
  ForumQuestion,
  ForumQuestionSummary,
  ForumReply,
  QuestionInput,
} from "./types";
import {
  canAskQuestion,
  canDeleteQuestion,
  canDeleteReply,
  canEditQuestion,
  canEditReply,
  canReply,
  cleanText,
  isQuestionClosed,
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
      const hasDoctorReply = list.some((r) => r.author_role === "DOCTOR");
      const isClosed = Boolean(q.isClosed || hasDoctorReply);
      const lastReply = list.reduce<ForumReply | undefined>(
        (last, r) => (!last || r.created_at > last.created_at ? r : last),
        undefined,
      );
      return {
        ...q,
        isClosed,
        hasDoctorReply,
        replyCount: list.length,
        lastReply,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const getQuestion = async (id: string) =>
  (await getDB()).get("forumQuestions", id);

export async function listReplies(questionId: string): Promise<ForumReply[]> {
  const db = await getDB();
  const replies = await db.getAllFromIndex("forumReplies", "by-question", questionId);
  return replies.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

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
    isClosed: false,
  };
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
  const tx = db.transaction("forumQuestions", "readwrite");
  const old = await tx.store.get(id);
  if (!old) throw new ForumError("Question introuvable.", "NOT_FOUND");
  if (!canEditQuestion(old, user))
    throw new ForumError(
      old.isClosed
        ? "Cette question est clôturée et ne peut plus être modifiée."
        : "Vous ne pouvez modifier que vos propres questions.",
      "FORBIDDEN",
    );
  assertValid(validateQuestion(input));

  const next: ForumQuestion = {
    ...old,
    title: cleanText(input.title),
    content: cleanText(input.content),
    updated_at: now(),
    syncStatus: "pending",
  };
  await tx.store.put(next);
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
  assertValid(validateReply(content));

  const db = await getDB();
  // Transaction atomique sur les questions et les réponses
  const tx = db.transaction(["forumQuestions", "forumReplies"], "readwrite");
  const qStore = tx.objectStore("forumQuestions");
  const rStore = tx.objectStore("forumReplies");

  const question = await qStore.get(questionId);
  if (!question) throw new ForumError("Question introuvable.", "NOT_FOUND");

  // Vérifier si un médecin a déjà répondu ou si la question est déjà clôturée
  const existingReplies = await rStore.index("by-question").getAll(questionId);
  const alreadyClosed = isQuestionClosed(question, existingReplies);

  if (alreadyClosed) {
    throw new ForumError(
      "Cette question est clôturée suite à la réponse d'un médecin. Aucune autre réponse ne peut être ajoutée.",
      "FORBIDDEN",
    );
  }

  if (!canReply(user, question, existingReplies)) {
    throw new ForumError("Vous ne pouvez pas répondre à cette question.", "FORBIDDEN");
  }

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

  await rStore.add(reply);

  // RÈGLE MÉTIER : Si un médecin répond, la question est clôturée définitivement
  if (user.role === "DOCTOR") {
    const updatedQuestion: ForumQuestion = {
      ...question,
      isClosed: true,
      closedAt: t,
      closedBy: user.name,
      updated_at: t,
    };
    await qStore.put(updatedQuestion);
  }

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

// --- Synchronisation (simulée, comme pour les feedbacks) --------------------

export async function syncPendingForum() {
  const db = await getDB();
  const tx = db.transaction(["forumQuestions", "forumReplies"], "readwrite");
  const questions = tx.objectStore("forumQuestions");
  const replies = tx.objectStore("forumReplies");
  const [qs, rs] = await Promise.all([questions.getAll(), replies.getAll()]);
  await Promise.all([
    ...qs
      .filter((q) => q.syncStatus === "pending")
      .map((q) => questions.put({ ...q, syncStatus: "synced" })),
    ...rs
      .filter((r) => r.syncStatus === "pending")
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

  // 1. Question 1 : Clôturée car répondue par un médecin
  await tx.objectStore("forumQuestions").put({
    ...base,
    id: "forum-demo1",
    author_id: "demo-patient",
    author_name: "Ahmed Mansour",
    author_role: "PATIENT",
    title: "Comment préparer une première consultation avec un cardiologue ?",
    content:
      "Je vais voir un cardiologue pour la première fois. Quels documents faut-il apporter au rendez-vous et faut-il venir à jeun ?",
    isClosed: true,
    closedAt: t,
    closedBy: "Dr. Amel Ben Salem",
  });
  await tx.objectStore("forumReplies").put({
    ...base,
    id: "forum-demo1-r1",
    question_id: "forum-demo1",
    author_id: "demo-doctor",
    author_name: "Dr. Amel Ben Salem",
    author_role: "DOCTOR",
    content:
      "Bonjour M. Mansour. Pour un premier bilan cardiologique : apportez votre carte d'assuré, vos dernières ordonnances en cours, vos bilans sanguins récents et tout électrocardiogramme antérieur si vous en possédez. Il n'est généralement pas nécessaire d'être à jeun sauf si une prise de sang spécifique a été prescrite à l'avance.",
  });

  // 2. Question 2 : Question ouverte en attente de réponse médicale
  await tx.objectStore("forumQuestions").put({
    ...base,
    id: "forum-demo2",
    author_id: "demo-patient-2",
    author_name: "Sarra Ben Ali",
    author_role: "PATIENT",
    title: "Recommandations avant une consultation dermatologique",
    content:
      "Bonjour, je dois consulter un dermatologue pour surveiller des grains de beauté. Dois-je éviter d'appliquer des crèmes ou du maquillage le jour J ?",
    isClosed: false,
  });
  await tx.objectStore("forumReplies").put({
    ...base,
    id: "forum-demo2-r1",
    question_id: "forum-demo2",
    author_id: "demo-patient",
    author_name: "Ahmed Mansour",
    author_role: "PATIENT",
    content:
      "D'expérience, le dermatologue m'avait demandé d'avoir une peau propre sans crème pour bien observer avec le dermatoscope !",
  });

  await tx.done;
}
