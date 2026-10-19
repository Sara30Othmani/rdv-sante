"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/lib/session";

import { appointments, userName } from "@/lib/mock";

import { FeedbackType } from "@/lib/feedbacks/types";

import { createFeedback, getFeedback, updateFeedback } from "@/lib/feedbacks/service";

import RatingStars from "@/components/feedbacks/RatingStars";
 
function FormContent() {

  const id = useSearchParams().get("id");

  const router = useRouter();

  const { user } = useSession();
 
  const [type, setType] = useState<FeedbackType>("REVIEW");

  const [appointmentId, setAppointmentId] = useState("");

  const [rating, setRating] = useState(0);

  const [subject, setSubject] = useState("");

  const [content, setContent] = useState("");

  const [error, setError] = useState("");
 
  useEffect(() => {

    if (!id) return;

    getFeedback(id).then((f) => {

      if (!f) return;

      setType(f.type);

      setAppointmentId(f.appointment_id);

      setRating(f.rating ?? 0);

      setSubject(f.subject ?? "");

      setContent(f.content);

    });

  }, [id]);
 
  const myAppointments = appointments.filter(

    (a) => a.patient_id === user.id && (type === "COMPLAINT" || a.status === "DONE")

  );
 
  async function submit(e: React.FormEvent) {

    e.preventDefault();

    setError("");

    const appt = appointments.find((a) => a.id === appointmentId);

    try {

      const data = {

        user_id: user.id,

        doctor_id: appt?.doctor_id ?? "",

        appointment_id: appointmentId,

        type,

        rating: type === "REVIEW" ? rating : undefined,

        subject: type === "COMPLAINT" ? subject : undefined,

        content,

      };

      if (id) await updateFeedback(id, data);

      else await createFeedback(data);

      router.push("/feedbacks");

    } catch (err) {

      setError((err as Error).message);

    }

  }
 
  if (user.role !== "PATIENT")

    return <p className="py-10 text-center">Seul un patient peut créer un feedback. Change d&apos;utilisateur en haut.</p>;
 
  return (
<form onSubmit={submit} className="mx-auto max-w-lg space-y-4 rounded-xl border bg-white p-4">
<h1 className="text-xl font-bold">{id ? "Modifier" : "Nouveau"} feedback</h1>
 
      {!id && (
<div className="grid grid-cols-2 gap-2">

          {(["REVIEW", "COMPLAINT"] as const).map((t) => (
<button

              key={t}

              type="button"

              onClick={() => { setType(t); setAppointmentId(""); }}

              className={`rounded-lg border p-3 ${type === t ? "bg-sky-600 text-white" : "bg-white"}`}
>

              {t === "REVIEW" ? "Avis" : "Réclamation"}
</button>

          ))}
</div>

      )}
 
      <label className="block">
<span className="text-sm">Rendez-vous</span>
<select

          value={appointmentId}

          onChange={(e) => setAppointmentId(e.target.value)}

          disabled={!!id}

          className="mt-1 w-full rounded border p-3"
>
<option value="">-- Choisir --</option>

          {myAppointments.map((a) => (
<option key={a.id} value={a.id}>

              {a.date} · {userName(a.doctor_id)}
</option>

          ))}
</select>
</label>
 
      {type === "REVIEW" ? (
<div>
<span className="text-sm">Note</span>
<RatingStars value={rating} onChange={setRating} />
</div>

      ) : (
<label className="block">
<span className="text-sm">Sujet</span>
<input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded border p-3" />
</label>

      )}
 
      <label className="block">
<span className="text-sm">Message</span>
<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="mt-1 w-full rounded border p-3" />
</label>
 
      {error && <p className="whitespace-pre-line text-sm text-red-600">{error}</p>}
 
      <button className="w-full rounded-lg bg-sky-600 p-3 text-white">Enregistrer</button>
</form>

  );

}
 
export default function FormPage() {

  return <Suspense><FormContent /></Suspense>;

}