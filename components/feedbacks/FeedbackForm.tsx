"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/session";
import { useAppointments } from "@/lib/useAppointments";
import type { FeedbackType } from "@/lib/feedbacks/types";
import {
  createFeedback,
  getFeedback,
  updateFeedback,
} from "@/lib/feedbacks/service";
import { canEdit } from "@/lib/feedbacks/rules";
import { feedbackRoutes } from "@/lib/roles";
import RatingStars from "./RatingStars";

const routes = feedbackRoutes("patient");

/** Formulaire de création / modification : réservé au patient (/patient/feedbacks/form). */
function FormContent() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const user = useUser();
  const { appointments, loaded, error: loadError } = useAppointments();

  const [type, setType] = useState<FeedbackType>("REVIEW");
  const [appointmentId, setAppointmentId] = useState("");
  const [rating, setRating] = useState(0);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [editable, setEditable] = useState(true);

  // Mode modification : on pré-remplit le formulaire
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getFeedback(id).then((f) => {
      if (cancelled || !f) return;
      setType(f.type);
      setAppointmentId(f.appointment_id);
      setRating(f.rating ?? 0);
      setSubject(f.subject ?? "");
      setContent(f.content);
      setEditable(canEdit(f, user.id, "PATIENT"));
    });
    return () => {
      cancelled = true;
    };
  }, [id, user.id]);

  // Réclamation : tout rendez-vous. Avis : uniquement une consultation terminée.
  const myAppointments = appointments.filter(
    (a) => a.patientId === user.id && (type === "COMPLAINT" || a.status === "Terminé")
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      if (id) {
        // Le type, le rendez-vous et le médecin ne changent plus après création
        await updateFeedback(id, {
          rating: type === "REVIEW" ? rating : undefined,
          subject: type === "COMPLAINT" ? subject : undefined,
          content,
        });
      } else {
        const appt = myAppointments.find((a) => a.id === appointmentId);
        await createFeedback({
          user_id: user.id,
          user_name: user.name,
          doctor_id: appt?.doctorId ?? "",
          doctor_name: appt?.doctorName ?? "",
          appointment_id: appointmentId,
          type,
          rating: type === "REVIEW" ? rating : undefined,
          subject: type === "COMPLAINT" ? subject : undefined,
          content,
        });
      }
      router.push(routes.list);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!editable)
    return (
      <main className="space-y-4">
        <Link href={routes.list} className="text-sm text-sky-700">
          ← Retour
        </Link>
        <p>Ce feedback ne peut plus être modifié.</p>
      </main>
    );

  return (
    <main>
      <form onSubmit={submit} className="space-y-7">
        <Link href={routes.list} className="text-sm text-sky-700">
          ← Retour
        </Link>
        <h1 className="text-xl font-bold">{id ? "Modifier" : "Nouveau"} feedback</h1>

        {!id && (
          <div className="grid grid-cols-2 gap-2">
            {(["REVIEW", "COMPLAINT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setAppointmentId("");
                }}
                className={`rounded-lg border p-3 ${
                  type === t ? "bg-sky-600 text-white" : "bg-white"
                }`}
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
            disabled={!!id || !loaded}
            className="mt-1 w-full rounded border bg-white p-3"
          >
            <option value="">-- Choisir --</option>
            {myAppointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.date} · {a.doctorName}
              </option>
            ))}
          </select>
          {loadError && <span className="mt-1 block text-xs text-red-600">{loadError}</span>}
          {!id && type === "REVIEW" && loaded && myAppointments.length === 0 && (
            <span className="mt-1 block text-xs text-gray-500">
              Un avis n&apos;est possible qu&apos;après une consultation terminée.
            </span>
          )}
        </label>

        {type === "REVIEW" ? (
          <div>
            <span className="text-sm">Note</span>
            <RatingStars value={rating} onChange={setRating} />
          </div>
        ) : (
          <label className="block">
            <span className="text-sm">Sujet</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded border bg-white p-3"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm">Message</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded border bg-white p-3"
          />
        </label>

        {error && <p className="whitespace-pre-line text-sm text-red-600">{error}</p>}

        <button type="submit" className="w-full rounded-lg bg-sky-600 p-3 text-white">
          Enregistrer
        </button>
      </form>
    </main>
  );
}

export default function FeedbackForm() {
  return (
    <Suspense fallback={<main><p>Chargement…</p></main>}>
      <FormContent />
    </Suspense>
  );
}
