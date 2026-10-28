"use client";
import Link from "next/link";
import type { ForumQuestionSummary } from "@/lib/forum/types";
import type { RoleSegment } from "@/lib/roles";
import { forumRoutes } from "@/lib/forum/routes";
import { ChatIcon, ClockIcon } from "./icons";
import { Avatar, RoleBadge, TimeAgo } from "./ui";

const plural = (n: number) => `${n} réponse${n > 1 ? "s" : ""}`;

export default function QuestionCard({ q, segment }: { q: ForumQuestionSummary; segment: RoleSegment }) {
  const href = forumRoutes(segment).question(q.id);
  const answered = q.replyCount > 0;

  return (
    <li>
      <article className="group relative flex gap-5 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-teal-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-600/20 sm:p-5">
        {/* Nombre de réponses, lisible d'un coup d'œil (masqué sur mobile) */}
        <div
          aria-hidden="true"
          className={`hidden w-16 shrink-0 flex-col items-center justify-center self-start rounded-lg py-2.5 sm:flex ${
            answered ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-500"
          }`}
        >
          <span className="text-xl leading-none font-semibold tabular-nums">{q.replyCount}</span>
          <span className="mt-1 text-[11px]">réponse{q.replyCount > 1 ? "s" : ""}</span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-snug font-semibold text-slate-900 sm:text-base">
            <Link
              href={href}
              className="transition-colors after:absolute after:inset-0 after:rounded-xl group-hover:text-teal-800 focus-visible:outline-none"
            >
              {q.title}
            </Link>
          </h2>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-pretty text-slate-600">{q.content}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <Avatar name={q.author_name} role={q.author_role} size="sm" />
              <span className="font-medium text-slate-700">{q.author_name}</span>
              <TimeAgo iso={q.created_at} />
            </span>

            <span className={`inline-flex items-center gap-1 sm:hidden ${answered ? "text-teal-800" : ""}`}>
              <ChatIcon size={14} />
              {plural(q.replyCount)}
            </span>

            {q.lastReply ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <span>Dernière réponse de</span>
                <span className="font-medium text-slate-700">{q.lastReply.author_name}</span>
                <RoleBadge role={q.lastReply.author_role} />
                <TimeAgo iso={q.lastReply.created_at} />
              </span>
            ) : (
              <span className="text-slate-400">En attente d&apos;une réponse</span>
            )}

            {q.syncStatus === "pending" && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <ClockIcon size={13} />
                Non synchronisée
              </span>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
