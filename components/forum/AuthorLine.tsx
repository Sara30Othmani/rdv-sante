"use client";
import type { Role } from "@/lib/feedbacks/types";
import { ClockIcon } from "./icons";
import { Avatar, RoleBadge, TimeAgo } from "./ui";

/** Auteur, rôle et dates d'une question ou d'une réponse. */
export default function AuthorLine({
  name,
  role,
  createdAt,
  updatedAt,
  pending,
  isMe,
  showAvatar = true,
}: {
  name: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
  pending?: boolean;
  isMe?: boolean;
  showAvatar?: boolean;
}) {
  const edited = updatedAt && updatedAt !== createdAt;
  return (
    <div className="flex min-w-0 items-center gap-3">
      {showAvatar && <Avatar name={name} role={role} />}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-slate-900">{name}</span>
          {isMe && <span className="text-xs text-slate-500">(vous)</span>}
          <RoleBadge role={role} />
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          <TimeAgo iso={createdAt} />
          {edited && <span title={`Modifié le ${new Date(updatedAt!).toLocaleString("fr-FR")}`}>Modifié</span>}
          {pending && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <ClockIcon size={13} />
              En attente de synchronisation
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
