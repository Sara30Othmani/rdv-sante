"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import { useSession } from "@/lib/session";

import { users } from "@/lib/mock";

import { Feedback } from "@/lib/feedbacks/types";

import { averageRating, listFeedbacks, seedIfEmpty } from "@/lib/feedbacks/service";
 
export default function Home() {

  const { user } = useSession();

  const [items, setItems] = useState<Feedback[]>([]);
 
  useEffect(() => {

    (async () => {

      await seedIfEmpty();

      setItems(await listFeedbacks());

    })();

  }, []);
 
  const complaints = items.filter((f) => f.type === "COMPLAINT");

  const count = (s: string) => complaints.filter((f) => f.status === s).length;
 
  return (
<div className="space-y-6">
<h1 className="text-2xl font-bold">Bonjour, {user.name}</h1>
 
      <div className="flex flex-col gap-3 sm:flex-row">
<Link href="/feedbacks" className="rounded-lg bg-sky-600 px-4 py-3 text-center text-white">

          Voir les feedbacks
</Link>
<Link href="/forum" className="rounded-lg border border-sky-600 px-4 py-3 text-center text-sky-700">

          Forum patients
</Link>

        {user.role === "PATIENT" && (
<Link href="/feedbacks/form" className="rounded-lg border border-sky-600 px-4 py-3 text-center text-sky-700">

            + Nouvel avis / réclamation
</Link>

        )}
</div>
 
      {user.role !== "PATIENT" && (
<section className="grid grid-cols-2 gap-3 md:grid-cols-4">

          {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => (
<div key={s} className="rounded-xl border bg-white p-4 text-center">
<p className="text-3xl font-bold">{count(s)}</p>
<p className="text-xs text-gray-500">{s}</p>
</div>

          ))}
</section>

      )}
 
      <section>
<h2 className="mb-2 font-semibold">Note moyenne par médecin</h2>
<ul className="grid gap-2 sm:grid-cols-2">

          {users.filter((u) => u.role === "DOCTOR").map((d) => (
<li key={d.id} className="flex justify-between rounded-lg border bg-white p-3">
<span>{d.name} <span className="text-xs text-gray-500">({d.specialty})</span></span>
<span className="font-semibold text-amber-500">

                {averageRating(items, d.id).toFixed(1)} ★
</span>
</li>

          ))}
</ul>
</section>
</div>

  );

}
 