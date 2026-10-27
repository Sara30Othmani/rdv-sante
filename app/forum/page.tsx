"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import type { ForumQuestionSummary } from "@/lib/forum/types";
import { canAskQuestion } from "@/lib/forum/rules";
import { listQuestions, seedForumIfEmpty } from "@/lib/forum/service";
import QuestionCard from "@/components/forum/QuestionCard";
import { ChatIcon, PlusIcon, SearchIcon } from "@/components/forum/icons";
import { buttonClass, focusRing, inputClass, Notice, StatePanel } from "@/components/forum/ui";

type Scope = "ALL" | "UNANSWERED" | "MINE";
const SCOPES: { value: Scope; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "UNANSWERED", label: "Sans réponse" },
  { value: "MINE", label: "Mes questions" },
];

function Skeleton() {
  return (
    <ul aria-hidden="true" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="hidden h-14 w-16 rounded-lg bg-slate-100 motion-safe:animate-pulse sm:block" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-3 w-full rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ForumPage() {
  const { user } = useSession();
  const [items, setItems] = useState<ForumQuestionSummary[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("ALL");

  const load = useCallback(async () => {
    setError("");
    try {
      await seedForumIfEmpty();
      setItems(await listQuestions());
    } catch {
      setError("Le forum n'a pas pu être chargé.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const term = search.trim().toLowerCase();
  const visible = (items ?? [])
    .filter((q) => scope !== "MINE" || q.author_id === user.id)
    .filter((q) => scope !== "UNANSWERED" || q.replyCount === 0)
    .filter(
      (q) => !term || q.title.toLowerCase().includes(term) || q.content.toLowerCase().includes(term),
    );
  const canAsk = canAskQuestion(user);
  const filtered = term !== "" || scope !== "ALL";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 py-2 sm:py-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Forum patients</h1>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">
            Posez vos questions sur votre parcours de soins. D&apos;autres patients et des médecins
            y répondent, et la discussion reste disponible quand vous revenez.
          </p>
        </div>
        {canAsk && (
          <Link href="/forum/form" className={buttonClass("primary", "md", "w-full sm:w-auto")}>
            <PlusIcon />
            Poser une question
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans les questions"
            aria-label="Rechercher dans les questions"
            className={`${inputClass()} pl-10`}
          />
        </div>
        <div
          role="group"
          aria-label="Filtrer les questions"
          className="flex rounded-lg border border-slate-200 bg-slate-100 p-1"
        >
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={scope === s.value}
              onClick={() => setScope(s.value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors sm:flex-none ${focusRing} ${
                scope === s.value
                  ? "bg-white font-medium text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Notice
          tone="error"
          action={
            <button type="button" onClick={load} className={buttonClass("secondary", "sm")}>
              Réessayer
            </button>
          }
        >
          {error}
        </Notice>
      )}

      {items === null ? (
        <>
          <p className="sr-only" role="status">Chargement des questions…</p>
          <Skeleton />
        </>
      ) : visible.length === 0 ? (
        items.length === 0 ? (
          !error && (
            <StatePanel
              icon={<ChatIcon size={22} />}
              title="Aucune question pour l'instant"
              action={
                canAsk && (
                  <Link href="/forum/form" className={buttonClass("primary")}>
                    <PlusIcon />
                    Poser la première question
                  </Link>
                )
              }
            >
              Les questions publiées ici restent visibles : d&apos;autres patients et des médecins
              pourront y répondre.
            </StatePanel>
          )
        ) : (
          <StatePanel
            icon={<SearchIcon size={22} />}
            title="Aucune question ne correspond"
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setScope("ALL");
                }}
                className={buttonClass("secondary")}
              >
                Afficher toutes les questions
              </button>
            }
          >
            {term ? <>Aucun résultat pour « {search.trim()} ». </> : null}
            Modifiez la recherche ou le filtre.
          </StatePanel>
        )
      ) : (
        <section aria-label="Questions" className="space-y-3">
          <p className="text-sm text-slate-500" aria-live="polite">
            {visible.length} question{visible.length > 1 ? "s" : ""}
            {filtered && ` sur ${items.length}`}
          </p>
          <ul className="space-y-3">
            {visible.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
