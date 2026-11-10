"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/session";
import type { RoleSegment } from "@/lib/roles";
import { forumRoutes } from "@/lib/forum/routes";
import type { ForumQuestion, ForumReply } from "@/lib/forum/types";
import {
  canDeleteQuestion, canDeleteReply, canEditQuestion, canEditReply, canReply, canRequestAiAnalysis, cleanText,
  isAiReply, LIMITS, validateReply,
} from "@/lib/forum/rules";
import {
  createReply, deleteQuestion, deleteReply, getQuestion, listReplies, sortReplies, updateReply,
} from "@/lib/forum/service";
import { runAiAnalysis } from "@/lib/forum/photo";
import AuthorLine from "@/components/forum/AuthorLine";
import {
  AlertIcon, ArrowLeftIcon, ChatIcon, PencilIcon, SendIcon, SparklesIcon, TrashIcon,
} from "@/components/forum/icons";
import {
  Avatar, buttonClass, ConfirmDialog, FieldFooter, inputClass, Notice, StatePanel, Toast, useAutoDismiss,
} from "@/components/forum/ui";

const NOTICES: Record<string, string> = {
  created: "Question publiée.",
  updated: "Question modifiée.",
};

type PendingDelete = { kind: "question" } | { kind: "reply"; id: string } | null;

function QuestionContent({ segment }: { segment: RoleSegment }) {
  const params = useSearchParams();
  const id = params.get("id");
  const router = useRouter();
  const user = useUser();
  const routes = forumRoutes(segment);

  const [question, setQuestion] = useState<ForumQuestion | null | undefined>(undefined);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(NOTICES[params.get("notice") ?? ""] ?? "");
  const [error, setError] = useState("");

  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const aiStarted = useRef(false);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);

  useAutoDismiss(notice, () => setNotice(""));

  // Analyse de la photo par l'IA (lancée par l'auteur de la question).
  const analyze = useCallback(async (q: ForumQuestion) => {
    setAnalyzing(true);
    setAiError("");
    try {
      const reply = await runAiAnalysis(user, q);
      setReplies((list) => sortReplies([...list.filter((r) => !isAiReply(r)), reply]));
      setQuestion((cur) => (cur ? { ...cur, ai_analysis: "done" } : cur));
    } catch (err) {
      setAiError((err as Error).message);
      if (navigator.onLine) setQuestion((cur) => (cur ? { ...cur, ai_analysis: "failed" } : cur));
    } finally {
      setAnalyzing(false);
    }
  }, [user]);

  const load = useCallback(async () => {
    if (!id) {
      setQuestion(null);
      return;
    }
    setLoadError("");
    try {
      const [q, r] = await Promise.all([getQuestion(id), listReplies(id)]);
      setQuestion(q ?? null);
      setReplies(r);
      // L'auteur ouvre sa question avec une photo pas encore analysée (juste
      // après la publication, ou après une coupure réseau) : on lance l'IA.
      if (q?.ai_analysis === "pending" && canRequestAiAnalysis(q, user) && !aiStarted.current) {
        aiStarted.current = true;
        analyze(q);
      }
    } catch {
      setLoadError("La discussion n'a pas pu être chargée.");
      setQuestion(null);
    }
  }, [id, user, analyze]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (message: string) => {
    setError("");
    setNotice(message);
  };

  async function postReply(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateReply(draft)[0];
    if (problem) return setDraftError(problem);
    if (!question) return;
    setPosting(true);
    setDraftError("");
    try {
      const reply = await createReply(user, question.id, draft);
      setReplies((list) => sortReplies([...list, reply]));
      setDraft("");
      if (user.role === "DOCTOR") {
        setQuestion((prev) => (prev ? { ...prev, isClosed: true } : prev));
        flash("Réponse du médecin enregistrée. La question est désormais clôturée.");
      } else {
        flash("Réponse publiée.");
      }
    } catch (err) {
      setDraftError((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(replyId: string) {
    const problem = validateReply(editText)[0];
    if (problem) return setEditError(problem);
    setSavingEdit(true);
    setEditError("");
    try {
      const updated = await updateReply(user, replyId, editText);
      setReplies((list) => list.map((r) => (r.id === replyId ? updated : r)));
      setEditingId(null);
      flash("Réponse modifiée.");
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !question) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === "question") {
        await deleteQuestion(user, question.id);
        router.push(routes.list);
      } else {
        await deleteReply(user, pendingDelete.id);
        setReplies((list) => list.filter((r) => r.id !== pendingDelete.id));
        setPendingDelete(null);
        flash("Réponse supprimée.");
      }
    } catch (err) {
      setError((err as Error).message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const back = (
    <Link
      href={routes.list}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
    >
      <ArrowLeftIcon size={14} />
      Retour au forum
    </Link>
  );

  if (question === undefined)
    return (
      <main className="max-w-3xl space-y-4">
        {back}
        <div className="rounded-2xl border border-slate-200 bg-white p-7">
          <div className="h-4 w-1/4 rounded bg-slate-100 motion-safe:animate-pulse" />
          <div className="mt-4 h-6 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </div>
      </main>
    );

  if (!question)
    return (
      <main className="max-w-3xl space-y-4">
        {back}
        <StatePanel
          icon={<AlertIcon size={22} />}
          title={loadError ? "Erreur de chargement" : "Question introuvable"}
          action={loadError && <button type="button" onClick={load} className={buttonClass("secondary")}>Réessayer</button>}
        >
          {loadError || "Cette question n'existe pas ou a été supprimée."}
        </StatePanel>
      </main>
    );

  const q = question;
  const n = replies.length;
  const isClosed = isQuestionClosed(q, replies);
  const showQuestionActions = canEditQuestion(q, user) || canDeleteQuestion(q, user);

  return (
    <main className="max-w-3xl space-y-6">
      {back}

      <Toast message={notice} onDismiss={() => setNotice("")} />
      {error && <Notice tone="error" onDismiss={() => setError("")}>{error}</Notice>}

      {/* Question d'origine */}
      <article className={`overflow-hidden rounded-2xl border bg-white shadow-xs ${
        isClosed ? "border-emerald-200" : "border-slate-200"
      }`}>
        <div className="px-5 pt-5 pb-6 sm:px-7 sm:pt-7">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <AuthorLine
              name={q.author_name}
              role={q.author_role}
              createdAt={q.created_at}
              updatedAt={q.updated_at}
              pending={q.syncStatus === "pending"}
              isMe={q.author_id === user.id}
            />

            {isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                <span>🔒</span> Clôturée — Réponse médicale validée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <span>💬</span> Ouverte aux réponses
              </span>
            )}
          </div>

          <h1 className="text-xl leading-snug font-semibold tracking-tight text-pretty text-slate-900 sm:text-2xl">
            {q.title}
          </h1>
          <p className="mt-3 max-w-prose text-[15px] leading-7 whitespace-pre-line text-slate-700">{q.content}</p>
          {q.photo && (
            <figure className="mt-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale */}
              <img
                src={q.photo}
                alt={`Photo jointe à la question « ${q.title} »`}
                className="max-h-[28rem] w-auto max-w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
              />
            </figure>
          )}
        </div>
        {showQuestionActions && (
          <div className="flex justify-end gap-1 border-t border-slate-100 bg-slate-50/60 px-4 py-2 sm:px-5">
            {canEditQuestion(q, user) && (
              <Link href={routes.form(q.id)} className={buttonClass("ghost", "sm")}>
                <PencilIcon size={16} />
                Modifier
              </Link>
            )}
            {canDeleteQuestion(q, user) && (
              <button
                type="button"
                onClick={() => setPendingDelete({ kind: "question" })}
                className={buttonClass("dangerGhost", "sm")}
              >
                <TrashIcon size={16} />
                Supprimer
              </button>
            )}
          </div>
        )}
      </article>

      {/* Fil des réponses */}
      <section aria-labelledby="replies-title">
        <h2 id="replies-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ChatIcon className="text-slate-400" />
          {n === 0 ? "Réponses" : `${n} réponse${n > 1 ? "s" : ""}`}
        </h2>

        {q.photo && q.ai_analysis !== "done" && !replies.some(isAiReply) && (
          <AiStatus
            question={q}
            analyzing={analyzing}
            error={aiError}
            canRetry={canRequestAiAnalysis(q, user) && !analyzing}
            onRetry={() => analyze(q)}
          />
        )}

        {n === 0 && !(q.photo && q.ai_analysis !== "done") ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm text-slate-500">
            Pas encore de réponse. {canReply(user, q, replies) ? "Partagez votre expérience ci-dessous, ou revenez plus tard." : "Revenez plus tard."}
          </p>
        ) : (
          <ol className="mt-4">
            {replies.map((r, i) => {
              const doctor = r.author_role === "DOCTOR";
              const ai = isAiReply(r);
              const editing = editingId === r.id;
              const last = i === n - 1;
              return (
                <li key={r.id} className={`flex gap-3 sm:gap-4 ${last ? "" : "pb-4"}`}>
                  {/* Avatar relié au suivant par le fil de discussion */}
                  <div className="flex flex-col items-center">
                    <Avatar name={r.author_name} role={r.author_role} />
                    {!last && <span aria-hidden="true" className="mt-2 w-px flex-1 bg-slate-200" />}
                  </div>

                  <div
                    className={`min-w-0 flex-1 rounded-xl border px-4 py-3.5 sm:px-5 ${
                      ai
                        ? "border-violet-200 bg-violet-50/50"
                        : doctor
                          ? "border-teal-200 bg-teal-50/50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <AuthorLine
                        name={r.author_name}
                        role={r.author_role}
                        createdAt={r.created_at}
                        updatedAt={r.updated_at}
                        pending={r.syncStatus === "pending"}
                        isMe={r.author_id === user.id}
                        showAvatar={false}
                      />
                      {doctor && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5">
                          ✓ Réponse certifiée médecin (Clôture)
                        </span>
                      )}
                    </div>

                    {editing ? (
                      <div className="mt-3">
                        <label htmlFor={`edit-${r.id}`} className="sr-only">Modifier la réponse</label>
                        <textarea
                          id={`edit-${r.id}`}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={4}
                          autoFocus
                          maxLength={LIMITS.replyMax}
                          aria-invalid={!!editError}
                          aria-describedby={`edit-${r.id}-footer`}
                          className={`resize-y ${inputClass(!!editError)}`}
                        />
                        <FieldFooter
                          id={`edit-${r.id}-footer`}
                          error={editError}
                          length={cleanText(editText).length}
                          max={LIMITS.replyMax}
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={savingEdit}
                            className={buttonClass("secondary", "sm")}
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(r.id)}
                            disabled={savingEdit}
                            className={buttonClass("primary", "sm")}
                          >
                            {savingEdit ? "Enregistrement…" : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2.5 text-[15px] leading-7 whitespace-pre-line text-slate-700">{r.content}</p>
                    )}
                    {ai && (
                      <p className="mt-2 text-xs leading-relaxed text-violet-800/80">
                        Réponse générée automatiquement à partir de la photo. Elle ne remplace pas l&apos;avis d&apos;un médecin.
                      </p>
                    )}

                    {!editing && (canEditReply(r, user) || canDeleteReply(r, user)) && (
                      <div className="mt-2 -mb-1 -ml-2.5 flex gap-1">
                        {canEditReply(r, user) && !isClosed && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(r.id);
                              setEditText(r.content);
                              setEditError("");
                            }}
                            className={buttonClass("ghost", "sm", "h-7 text-xs")}
                          >
                            <PencilIcon size={14} />
                            Modifier
                          </button>
                        )}
                        {canDeleteReply(r, user) && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ kind: "reply", id: r.id })}
                            className={buttonClass("dangerGhost", "sm", "h-7 text-xs")}
                          >
                            <TrashIcon size={14} />
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* État de clôture ou formulaire de nouvelle réponse */}
      {isClosed ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-7 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-xl font-bold">
            🔒
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900">
            Cette question est clôturée
          </h3>
          <p className="mt-1.5 text-sm text-slate-700 max-w-lg mx-auto">
            Un médecin professionnel a apporté une réponse médicale à cette question.
            Conformément aux règles du cabinet, la discussion est automatiquement clôturée et aucune nouvelle réponse ne peut être ajoutée.
          </p>
        </div>
      ) : canReply(user, q, replies) ? (
        <form
          onSubmit={postReply}
          noValidate
          aria-labelledby="reply-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
        >
          <div className="flex gap-3 sm:gap-4">
            <span className="hidden sm:block"><Avatar name={user.name} role={user.role} /></span>
            <div className="min-w-0 flex-1">
              <label id="reply-title" htmlFor="reply" className="block text-sm font-semibold text-slate-900">
                {user.role === "DOCTOR"
                  ? "Répondre en tant que médecin (clôturera la discussion)"
                  : "Ajouter une réponse"}
              </label>
              <textarea
                id="reply"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (draftError) setDraftError("");
                }}
                rows={4}
                maxLength={LIMITS.replyMax}
                placeholder={
                  user.role === "DOCTOR"
                    ? "Rédigez votre réponse médicale d'expert. Dès publication, la question sera marquée comme résolue et clôturée..."
                    : "Partagez votre expérience ou une information utile…"
                }
                aria-invalid={!!draftError}
                aria-describedby="reply-footer reply-hint"
                className={`mt-2 resize-y ${inputClass(!!draftError)}`}
              />
              <FieldFooter id="reply-footer" error={draftError} length={cleanText(draft).length} max={LIMITS.replyMax} />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p id="reply-hint" className="text-xs leading-relaxed text-slate-500">
                  {user.role === "DOCTOR"
                    ? "⚕️ Votre réponse fera foi d'expertise et clôturera le fil."
                    : "Restez bienveillant et ne partagez pas de données médicales personnelles."}
                </p>
                <button type="submit" disabled={posting} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
                  <SendIcon size={16} />
                  {posting
                    ? "Publication…"
                    : user.role === "DOCTOR"
                    ? "Publier & Clôturer la question"
                    : "Publier la réponse"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        busy={deleting}
        title={pendingDelete?.kind === "question" ? "Supprimer la question ?" : "Supprimer la réponse ?"}
        confirmLabel="Supprimer"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        description={
          pendingDelete?.kind === "question"
            ? n > 0
              ? `La question et ses ${n} réponse${n > 1 ? "s" : ""} seront définitivement supprimées.`
              : "La question sera définitivement supprimée."
            : "La réponse sera définitivement supprimée."
        }
      />
    </main>
  );
}

/** Encadré à la place de la réponse de l'IA tant qu'elle n'est pas là. */
function AiStatus({
  question, analyzing, error, canRetry, onRetry,
}: {
  question: ForumQuestion;
  analyzing: boolean;
  error: string;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const failed = !analyzing && (question.ai_analysis === "failed" || !!error);
  return (
    <div
      role="status"
      className={`mt-4 flex gap-3 rounded-xl border px-4 py-3.5 text-sm sm:px-5 ${
        failed ? "border-amber-200 bg-amber-50 text-amber-900" : "border-violet-200 bg-violet-50/60 text-violet-900"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${analyzing ? "animate-pulse" : ""}`}><SparklesIcon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {analyzing
            ? "L'assistant IA analyse la photo…"
            : failed
              ? "La photo n'a pas pu être analysée."
              : "La photo sera analysée par l'assistant IA."}
        </p>
        {!analyzing && error && <p className="mt-1 text-xs leading-relaxed">{error}</p>}
        {!analyzing && !error && !failed && (
          <p className="mt-1 text-xs leading-relaxed">Sa réponse apparaîtra ici, en premier, dès que l&apos;auteur ouvrira la discussion.</p>
        )}
        {failed && canRetry && (
          <button type="button" onClick={onRetry} className={buttonClass("secondary", "sm", "mt-2.5")}>
            Réessayer l&apos;analyse
          </button>
        )}
      </div>
    </div>
  );
}

// Next.js garde les pages visitées en mémoire (cacheComponents / <Activity>).
// La clé sur l'URL évite de réafficher la réponse en cours, le message ou les
// données d'une autre question (ou d'avant une modification).
function KeyedDiscussion({ segment }: { segment: RoleSegment }) {
  const key = useSearchParams().toString();
  return <QuestionContent key={key} segment={segment} />;
}

export default function ForumDiscussion({ segment }: { segment: RoleSegment }) {
  return <Suspense><KeyedDiscussion segment={segment} /></Suspense>;
}
