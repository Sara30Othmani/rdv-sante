"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/session";
import type { RoleSegment } from "@/lib/roles";
import { forumRoutes } from "@/lib/forum/routes";
import type { ForumQuestion } from "@/lib/forum/types";
import {
  canAskQuestion, canEditQuestion, LIMITS, PHOTO_TYPES, validateContent, validateTitle,
} from "@/lib/forum/rules";
import { createQuestion, getQuestion, updateQuestion } from "@/lib/forum/service";
import { checkPhotoFile, compressPhoto } from "@/lib/forum/photo";
import { AlertIcon, ArrowLeftIcon, ChatIcon, ImageIcon, InfoIcon, SparklesIcon, TrashIcon } from "@/components/forum/icons";
import { buttonClass, FieldFooter, inputClass, Notice, StatePanel } from "@/components/forum/ui";

const PHOTO_ACCEPT = PHOTO_TYPES.join(",");

function FormContent({ segment, id }: { segment: RoleSegment; id: string | null }) {
  const router = useRouter();
  const user = useUser();
  const routes = forumRoutes(segment);

  // undefined = chargement, null = introuvable (mode édition uniquement)
  const [existing, setExisting] = useState<ForumQuestion | null | undefined>(id ? undefined : null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [touched, setTouched] = useState({ title: false, content: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getQuestion(id).then((q) => {
      setExisting(q ?? null);
      setTitle(q?.title ?? "");
      setContent(q?.content ?? "");
      setPhoto(q?.photo ?? null);
    });
  }, [id]);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de rechoisir le même fichier
    if (!file) return;
    const problem = checkPhotoFile(file);
    if (problem) return setPhotoError(problem);
    setPhotoError("");
    setReadingPhoto(true);
    try {
      setPhoto(await compressPhoto(file));
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setReadingPhoto(false);
    }
  }

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
        ? await updateQuestion(user, id, { title, content, photo })
        : await createQuestion(user, { title, content, photo });
      // Next.js garde la page en mémoire (cacheComponents / <Activity>) :
      // on vide le formulaire pour que la prochaine visite reparte de zéro.
      setTitle("");
      setContent("");
      setPhoto(null);
      setTouched({ title: false, content: false });
      setSaving(false);
      router.push(routes.question(q.id, id ? "updated" : "created"));
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const back = (
    <Link href={routes.list} className={buttonClass("ghost", "sm", "-ml-2.5")}>
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
          ? { title: "Réservé aux patients", text: "Seuls les patients peuvent poser une question. Les médecins répondent depuis la discussion." }
          : null;

  if (blocked)
    return (
      <main className="max-w-2xl space-y-4">
        {back}
        <StatePanel icon={<AlertIcon size={22} />} title={blocked.title}>{blocked.text}</StatePanel>
      </main>
    );

  const editing = !!existing;
  const cancelHref = existing ? routes.question(existing.id) : routes.list;

  return (
    <main className="max-w-2xl space-y-4">
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

          <div>
            <p id="q-photo-label" className="block text-sm font-medium text-slate-900">
              Photo <span className="font-normal text-slate-500">(facultative)</span>
            </p>
            <p id="q-photo-hint" className="mt-0.5 text-xs text-slate-500">
              JPEG, PNG ou WebP, 10 Mo maximum. L&apos;assistant IA analysera la photo et publiera la première réponse.
            </p>
            <input
              id="q-photo"
              ref={fileRef}
              type="file"
              accept={PHOTO_ACCEPT}
              onChange={pickPhoto}
              className="sr-only"
              aria-labelledby="q-photo-label"
              aria-describedby="q-photo-hint"
            />
            {photo ? (
              <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale */}
                <img
                  src={photo}
                  alt="Aperçu de la photo jointe"
                  className="max-h-48 w-full rounded-lg bg-slate-50 object-contain sm:w-48"
                />
                <div className="flex flex-1 flex-col gap-2">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-violet-800">
                    <SparklesIcon size={15} className="mt-px shrink-0" />
                    {editing && photo !== existing?.photo
                      ? "La nouvelle photo sera analysée par l'IA ; la réponse précédente de l'IA sera remplacée."
                      : "Cette photo sera analysée par l'IA."}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={readingPhoto} className={buttonClass("secondary", "sm")}>
                      <ImageIcon size={16} />
                      Changer
                    </button>
                    <button type="button" onClick={() => setPhoto(null)} disabled={readingPhoto} className={buttonClass("dangerGhost", "sm")}>
                      <TrashIcon size={16} />
                      Retirer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={readingPhoto}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600 transition-colors hover:border-teal-400 hover:bg-teal-50/40 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600"
              >
                <ImageIcon size={18} />
                {readingPhoto ? "Préparation de la photo…" : "Ajouter une photo"}
              </button>
            )}
            {photoError && (
              <p role="alert" className="mt-1.5 text-xs text-red-600">{photoError}</p>
            )}
          </div>

          <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900">
            <InfoIcon className="mt-0.5 shrink-0 text-sky-700" />
            <p>
              Votre question et sa photo seront visibles par tous les utilisateurs de RDV Santé. N&apos;indiquez pas
              d&apos;informations médicales personnelles (diagnostic, traitement, résultats d&apos;examens) et
              évitez les photos où l&apos;on peut vous reconnaître. La photo est envoyée à un service d&apos;IA
              (Google Gemini) pour être analysée.
            </p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Link href={cancelHref} className={buttonClass("secondary")}>Annuler</Link>
          <button type="submit" form="question-form" disabled={saving || readingPhoto} className={buttonClass("primary")}>
            {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Publier la question"}
          </button>
        </div>
      </div>
    </main>
  );
}

// La clé repart d'un état neuf quand on passe de « modifier » à « nouvelle question ».
function KeyedForm({ segment }: { segment: RoleSegment }) {
  const id = useSearchParams().get("id");
  return <FormContent key={id ?? "new"} segment={segment} id={id} />;
}

export default function ForumForm({ segment }: { segment: RoleSegment }) {
  return <Suspense><KeyedForm segment={segment} /></Suspense>;
}
