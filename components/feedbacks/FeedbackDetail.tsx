"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/session";
import type { Feedback, FeedbackStatus } from "@/lib/feedbacks/types";
import {
  canDelete,
  canEdit,
  canManageStatus,
  canRespond,
  canView,
  NEXT_STATUS,
} from "@/lib/feedbacks/rules";
import {
  changeStatus,
  deleteFeedback,
  getFeedback,
  respond,
} from "@/lib/feedbacks/service";
import { ROLE_BY_SEGMENT, feedbackRoutes, type RoleSegment } from "@/lib/roles";
import StatusBadge, { STATUS_LABEL } from "./StatusBadge";
import RatingStars from "./RatingStars";

const STEPS: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function DetailContent({ segment }: { segment: RoleSegment }) {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const user = useUser();

  const role = ROLE_BY_SEGMENT[segment]; // rôle déduit de l'URL
  const routes = feedbackRoutes(segment);

  const [fb, setFb] = useState<Feedback | null | undefined>(undefined);
  const [resp, setResp] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getFeedback(id)
      .then((f) => {
        if (cancelled) return;
        setFb(f ?? null);
        setResp(f?.response ?? "");
      })
      .catch(() => {
        if (!cancelled) setFb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function run(action: () => Promise<Feedback | void>) {
    setError("");
    try {
      const res = await action();
      if (res) setFb(res);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const back = (
    <Link href={routes.list} className="text-sm text-sky-700">
      ← Retour
    </Link>
  );

  if (!id)
    return (
      <main className="space-y-4">
        {back}
        <p>Feedback introuvable.</p>
      </main>
    );
  if (fb === undefined) return <main><p>Chargement…</p></main>;
  if (fb === null || !canView(fb, user.id, role))
    return (
      <main className="space-y-4">
        {back}
        <p>Feedback introuvable.</p>
      </main>
    );

  const next = NEXT_STATUS[fb.status];

  return (
    <main className="space-y-7">
      {back}

      <article className="space-y-3 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-sky-700">
            {fb.type === "REVIEW" ? "Avis" : "Réclamation"}
          </span>
          {fb.type === "COMPLAINT" && <StatusBadge status={fb.status} />}
        </div>
        <h1 className="text-lg font-bold">
          {fb.subject ?? `Avis sur ${fb.doctor_name}`}
        </h1>
        {fb.type === "REVIEW" && <RatingStars value={fb.rating ?? 0} />}
        <p>{fb.content}</p>
        <p className="text-xs text-gray-500">
          Par {fb.user_name} · pour {fb.doctor_name} ·{" "}
          {new Date(fb.created_at).toLocaleString("fr-FR")}
        </p>
      </article>

      {fb.type === "COMPLAINT" && (
        <ol className="grid grid-cols-4 gap-1 text-center text-xs">
          {STEPS.map((s) => (
            <li
              key={s}
              className={`rounded p-2 ${
                STEPS.indexOf(s) <= STEPS.indexOf(fb.status)
                  ? "bg-sky-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      )}

      {fb.response && (
        <div className="rounded-xl border-l-4 border-sky-500 bg-sky-50 p-4">
          <p className="mb-1 text-sm font-semibold">Réponse</p>
          <p>{fb.response}</p>
        </div>
      )}

      {canRespond(fb, user.id, role) && fb.status !== "CLOSED" && (
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <textarea
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            rows={3}
            placeholder="Votre réponse…"
            aria-label="Votre réponse"
            className="w-full rounded border p-3"
          />
          <button
            type="button"
            onClick={() => run(() => respond(fb.id, resp))}
            className="w-full rounded-lg bg-sky-600 p-3 text-white"
          >
            Envoyer la réponse
          </button>
        </div>
      )}

      {canManageStatus(fb, user.id, role) && next && (
        <button
          type="button"
          onClick={() => run(() => changeStatus(fb.id, next))}
          className="w-full rounded-lg border border-sky-600 p-3 text-sky-700"
        >
          Passer à : {STATUS_LABEL[next]}
        </button>
      )}

      <div className="flex gap-2">
        {canEdit(fb, user.id, role) && (
          <Link
            href={routes.form(fb.id)}
            className="flex-1 rounded-lg border p-3 text-center"
          >
            Modifier
          </Link>
        )}
        {canDelete(fb, user.id, role) && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Supprimer ce feedback ?")) return;
              try {
                await deleteFeedback(fb.id);
                router.push(routes.list);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
            className="flex-1 rounded-lg border border-red-500 p-3 text-red-600"
          >
            Supprimer
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}

// useSearchParams() exige un <Suspense> : on le met ici, une seule fois,
// pour que les pages n'aient plus qu'une ligne.
export default function FeedbackDetail({ segment }: { segment: RoleSegment }) {
  return (
    <Suspense fallback={<main><p>Chargement…</p></main>}>
      <DetailContent segment={segment} />
    </Suspense>
  );
}
