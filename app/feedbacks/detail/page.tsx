"use client";

import Link from "next/link";

import { Suspense, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/lib/session";

import { userName } from "@/lib/mock";

import { Feedback, FeedbackStatus } from "@/lib/feedbacks/types";

import {

  canDelete, canEdit, canManageStatus, canRespond, NEXT_STATUS,

} from "@/lib/feedbacks/rules";

import { changeStatus, deleteFeedback, getFeedback, respond } from "@/lib/feedbacks/service";

import StatusBadge, { STATUS_LABEL } from "@/components/feedbacks/StatusBadge";

import RatingStars from "@/components/feedbacks/RatingStars";
 
const STEPS: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
 
function DetailContent() {

  const id = useSearchParams().get("id");

  const router = useRouter();

  const { user } = useSession();

  const [fb, setFb] = useState<Feedback | null | undefined>(undefined);

  const [resp, setResp] = useState("");

  const [error, setError] = useState("");
 
  useEffect(() => {

    if (!id) return;

    getFeedback(id).then((f) => {

      setFb(f ?? null);

      setResp(f?.response ?? "");

    });

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
 
  if (fb === undefined) return <p>Chargement…</p>;

  if (fb === null) return <p>Feedback introuvable.</p>;
 
  const next = NEXT_STATUS[fb.status];
 
  return (
<div className="mx-auto max-w-2xl space-y-4">
<Link href="/feedbacks" className="text-sm text-sky-700">← Retour</Link>
 
      <article className="space-y-3 rounded-xl border bg-white p-4">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold uppercase text-sky-700">

            {fb.type === "REVIEW" ? "Avis" : "Réclamation"}
</span>

          {fb.type === "COMPLAINT" && <StatusBadge status={fb.status} />}
</div>
<h1 className="text-lg font-bold">{fb.subject ?? `Avis sur ${userName(fb.doctor_id)}`}</h1>

        {fb.type === "REVIEW" && <RatingStars value={fb.rating ?? 0} />}
<p>{fb.content}</p>
<p className="text-xs text-gray-500">

          Par {userName(fb.user_id)} · pour {userName(fb.doctor_id)} ·{" "}

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

                  ? "bg-sky-600 text-white" : "bg-gray-200 text-gray-600"

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
 
      {canRespond(fb, user.id, user.role) && fb.status !== "CLOSED" && (
<div className="space-y-2 rounded-xl border bg-white p-4">
<textarea

            value={resp}

            onChange={(e) => setResp(e.target.value)}

            rows={3}

            placeholder="Votre réponse…"

            className="w-full rounded border p-3"

          />
<button

            onClick={() => run(() => respond(fb.id, resp))}

            className="w-full rounded-lg bg-sky-600 p-3 text-white"
>

            Envoyer la réponse
</button>
</div>

      )}
 
      {canManageStatus(fb, user.id, user.role) && next && (
<button

          onClick={() => run(() => changeStatus(fb.id, next))}

          className="w-full rounded-lg border border-sky-600 p-3 text-sky-700"
>

          Passer à : {STATUS_LABEL[next]}
</button>

      )}
 
      <div className="flex gap-2">

        {canEdit(fb, user.id, user.role) && (
<Link

            href={`/feedbacks/form?id=${fb.id}`}

            className="flex-1 rounded-lg border p-3 text-center"
>

            Modifier
</Link>

        )}

        {canDelete(fb, user.id, user.role) && (
<button

            onClick={async () => {

              if (confirm("Supprimer ce feedback ?")) {

                await deleteFeedback(fb.id);

                router.push("/feedbacks");

              }

            }}

            className="flex-1 rounded-lg border border-red-500 p-3 text-red-600"
>

            Supprimer
</button>

        )}
</div>
 
      {error && <p className="text-sm text-red-600">{error}</p>}
</div>

  );

}
 
export default function DetailPage() {

  return <Suspense><DetailContent /></Suspense>;

}
 