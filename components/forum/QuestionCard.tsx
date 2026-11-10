"use client";
import Link from "next/link";
import type { ForumQuestionSummary } from "@/lib/forum/types";
import type { RoleSegment } from "@/lib/roles";
import { forumRoutes } from "@/lib/forum/routes";
import { ChatIcon, ClockIcon, ImageIcon } from "./icons";
import { Avatar, RoleBadge, TimeAgo } from "./ui";

const plural = (n: number) => `${n} réponse${n > 1 ? "s" : ""}`;

export default function QuestionCard({ q, segment }: { q: ForumQuestionSummary; segment: RoleSegment }) {
  const href = forumRoutes(segment).question(q.id);
  const answered = q.replyCount > 0;
  const isClosed = Boolean(q.isClosed || q.hasDoctorReply);

  return (
    <li>
      <article className={`group relative flex gap-5 rounded-xl border bg-white p-4 transition-colors focus-within:ring-2 sm:p-5 ${
        isClosed
          ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-600/20"
          : "border-slate-200 hover:border-teal-300 focus-within:border-teal-500 focus-within:ring-teal-600/20"
      }`}>
        {/* Nombre de réponses, lisible d'un coup d'œil (masqué sur mobile) */}
        <div
          aria-hidden="true"
          className={`hidden w-16 shrink-0 flex-col items-center justify-center self-start rounded-lg py-2.5 sm:flex ${
            isClosed
              ? "bg-emerald-100 text-emerald-800"
              : answered
              ? "bg-teal-50 text-teal-800"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          <span className="text-xl leading-none font-semibold tabular-nums">{q.replyCount}</span>
          <span className="mt-1 text-[11px] font-medium">réponse{q.replyCount > 1 ? "s" : ""}</span>
          {isClosed && <span className="mt-1 text-[10px] text-emerald-700 font-bold">🔒 Clôturé</span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isClosed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                <span>🔒</span> Clôturée — Réponse d&apos;un médecin
              </span>
            ) : answered ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                💬 Discussion ouverte
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                ⏳ En attente de réponse
              </span>
            )}
          </div>

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

            {q.photo && (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <ImageIcon size={14} />
                Photo
              </span>
            )}

            <span className={`inline-flex items-center gap-1 sm:hidden ${answered ? "text-teal-800" : ""}`}>
              <ChatIcon size={14} />
              {plural(q.replyCount)}
              {isClosed && " (Clôturé)"}
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
