"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import { useSession } from "@/lib/session";

import { Feedback } from "@/lib/feedbacks/types";

import { listFeedbacks, seedIfEmpty } from "@/lib/feedbacks/service";

import FeedbackCard from "@/components/feedbacks/feedbackCard";
 
export default function FeedbacksPage() {

  const { user } = useSession();

  const [items, setItems] = useState<Feedback[]>([]);

  const [type, setType] = useState("ALL");

  const [status, setStatus] = useState("ALL");
 
  useEffect(() => {

    (async () => {

      await seedIfEmpty();

      setItems(await listFeedbacks());

    })();

  }, []);
 
  const visible = items

    .filter((f) =>

      user.role === "ADMIN" ? true :

      user.role === "DOCTOR" ? f.doctor_id === user.id :

      f.user_id === user.id

    )

    .filter((f) => type === "ALL" || f.type === type)

    .filter((f) => status === "ALL" || f.status === status)

    .sort((a, b) => b.created_at.localeCompare(a.created_at));
 
  return (
<div className="space-y-4">
<div className="flex items-center justify-between">
<h1 className="text-xl font-bold">Feedbacks &amp; réclamations</h1>

        {user.role === "PATIENT" && (
<Link href="/feedbacks/form" className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white">

            + Nouveau
</Link>

        )}
</div>
 
      <div className="flex gap-2">
<select value={type} onChange={(e) => setType(e.target.value)} className="flex-1 rounded border bg-white p-2">
<option value="ALL">Tous les types</option>
<option value="REVIEW">Avis</option>
<option value="COMPLAINT">Réclamations</option>
</select>
<select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded border bg-white p-2">
<option value="ALL">Tous statuts</option>
<option value="OPEN">Ouverte</option>
<option value="IN_PROGRESS">En cours</option>
<option value="RESOLVED">Résolue</option>
<option value="CLOSED">Clôturée</option>
</select>
</div>
 
      {visible.length === 0 ? (
<p className="py-10 text-center text-gray-500">Aucun feedback.</p>

      ) : (
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">

          {visible.map((f) => <FeedbackCard key={f.id} f={f} />)}
</div>

      )}
</div>

  );

}
 