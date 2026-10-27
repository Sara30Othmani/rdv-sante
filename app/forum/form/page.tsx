"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";
import type { ForumQuestion } from "@/lib/forum/types";
import {
  canAskQuestion, canEditQuestion, LIMITS, validateContent, validateTitle,
} from "@/lib/forum/rules";
import { createQuestion, getQuestion, updateQuestion } from "@/lib/forum/service";
import { AlertIcon, ArrowLeftIcon, ChatIcon, InfoIcon } from "@/components/forum/icons";
import { buttonClass, FieldFooter, inputClass, Notice, StatePanel } from "@/components/forum/ui";

function FormContent() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { user } = useSession();

  // undefined = chargement, null = introuvable (mode édition uniquement)
  const [existing, setExisting] = useState<ForumQuestion | null | undefined>(id ? undefined : null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [touched, setTouched] = useState({ title: false, content: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    getQuestion(id).then((q) => {
      setExisting(q ?? null);
      setTitle(q?.title ?? "");
      setContent(q?.content ?? "");
    });
  }, [id]);

  const titleError = touched.title ? validateTitle(title) : null;
  const contentError = touched.content ? validateContent(content) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ title: true, content: true });
    setError("");
    if (validateTitle(title)) return titleRef.current?.focus();
    if (validateContent(content)) return contentRef.current?.focus();
    setSaving(true);
    try {
      const q = id
        ? await updateQuestion(user, id, { title, content })
        : await createQuestion(user, { title, content });
      router.push(`/forum/question?id=${encodeURIComponent(q.id)}&notice=${id ? "updated" : "created"}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const back = (
    <Link href="/forum" className={buttonClass("ghost", "sm", "-ml-2.5")}>
      <ArrowLeftIcon size={16} />
      Retour au forum
    </Link>
  );

  if (id && existing === undefined)
    return <p role="status" className="py-16 text-center text-sm text-slate-500">Chargement de la question…</p>;

  const blocked =
    id && existing === null
      ? { title: "Question introuvable", text: "Elle a peut-être été supprimée." }
      : existing && !canEditQuestion(existing, user)
        ? { title: "Modification impossible", text: "Vous ne pouvez modifier que les questions que vous avez publiées." }
        : !existing && !canAskQuestion(user)
          ? { title: "Réservé aux patients", text: "Seuls les patients peuvent poser une question. Changez d'utilisateur en haut de la page pour essayer." }
          : null;

  if (blocked)
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-2 sm:py-4">
        {back}
        <StatePanel icon={<AlertIcon size={22} />} title={blocked.title}>{blocked.text}</StatePanel>
      </div>
    );

  const editing = !!existing;
  const cancelHref = existing ? `/forum/question?id=${encodeURIComponent(existing.id)}` : "/forum";

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-2 sm:py-4">
      {back}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 sm:flex">
            <ChatIcon size={20} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {editing ? "Modifier la question" : "Poser une question"}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {editing
                ? "Les réponses déjà publiées restent attachées à votre question."
                : "Un titre court et un peu de contexte aident les autres à vous répondre."}
            </p>
          </div>
        </div>

        <form id="question-form" onSubmit={submit} noValidate className="space-y-6 px-5 py-6 sm:px-7">
          <div>
            <label htmlFor="q-title" className="block text-sm font-medium text-slate-900">Titre</label>
            <p id="q-title-hint" className="mt-0.5 text-xs text-slate-500">Résumez votre question en une phrase.</p>
            <input
              id="q-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              maxLength={LIMITS.titleMax}
              placeholder="Ex. : Que faut-il apporter à une première consultation ?"
              aria-invalid={!!titleError}
              aria-describedby="q-title-hint q-title-footer"
              className={`mt-2 ${inputClass(!!titleError)}`}
            />
            <FieldFooter id="q-title-footer" error={titleError} length={title.trim().length} max={LIMITS.titleMax} />
          </div>

          <div>
            <label htmlFor="q-content" className="block text-sm font-medium text-slate-900">Détails</label>
            <p id="q-content-hint" className="mt-0.5 text-xs text-slate-500">
              Expliquez votre situation et ce que vous aimeriez savoir.
            </p>
            <textarea
              id="q-content"
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, content: true }))}
              rows={7}
              maxLength={LIMITS.contentMax}
              placeholder="Donnez le contexte utile à ceux qui vous répondront…"
              aria-invalid={!!contentError}
              aria-describedby="q-content-hint q-content-footer"
              className={`mt-2 resize-y ${inputClass(!!contentError)}`}
            />
            <FieldFooter id="q-content-footer" error={contentError} length={content.trim().length} max={LIMITS.contentMax} />
          </div>

          <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900">
            <InfoIcon className="mt-0.5 shrink-0 text-sky-700" />
            <p>
              Votre question sera visible par tous les utilisateurs de RDV Santé. N&apos;indiquez pas
              d&apos;informations médicales personnelles (diagnostic, traitement, résultats d&apos;examens).
            </p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Link href={cancelHref} className={buttonClass("secondary")}>Annuler</Link>
          <button type="submit" form="question-form" disabled={saving} className={buttonClass("primary")}>
            {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Publier la question"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ForumFormPage() {
  return <Suspense><FormContent /></Suspense>;
}
