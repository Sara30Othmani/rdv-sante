"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Appointment } from "@/lib/appointments";
import {
  patchAppointment,
  useAppointments,
  useDoctors,
} from "@/lib/useAppointments";
import { slotsForDate } from "@/lib/schedule";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Formulaire affiché seulement quand le rendez-vous est chargé (valeurs initiales sûres). */
function ModifierForm({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const detailUrl = `/patient/rendez-vous/${appointment.id}`;

  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  const [reason, setReason] = useState(appointment.reason);
  const [error, setError] = useState("");
  const { doctors } = useDoctors();

  // Créneaux que le médecin propose CE jour-là (+ l'heure actuelle si la date n'a pas changé)
  const doctor = doctors.find((d) => d.id === appointment.doctorId);
  const slots = [
    ...new Set([
      ...(date === appointment.date ? [appointment.time] : []),
      ...(doctor ? slotsForDate(doctor.schedule, date) : []),
    ]),
  ].sort();
  // Si la date change et que l'heure choisie n'existe plus ce jour-là, on prend le 1er créneau
  const effectiveTime = slots.includes(time) ? time : (slots[0] ?? "");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      await patchAppointment(appointment.id, { date, time: effectiveTime, reason: reason.trim() });
      router.push(detailUrl);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCancelAppointment() {
    if (!confirm("Annuler ce rendez-vous ?")) return;
    setError("");
    try {
      await patchAppointment(appointment.id, { status: "Annulé" });
      router.push("/patient/rendez-vous");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="rdv-page">
      <Link href={detailUrl} className="rdv-back">
        ← Retour au détail
      </Link>

      <h1>Modifier le rendez-vous</h1>
      <p>
        {appointment.doctorName} · {appointment.specialty}
      </p>

      <form className="rdv-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            required
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="time">Heure</label>
          <select
            id="time"
            required
            value={effectiveTime}
            onChange={(e) => setTime(e.target.value)}
          >
            {slots.length === 0 && <option value="">Aucun créneau ce jour-là</option>}
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="reason">Motif</label>
          <textarea
            id="reason"
            rows={4}
            minLength={5}
            maxLength={500}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rdv-actions">
          <button type="submit" className="btn-prendre-rdv">
            Enregistrer les modifications
          </button>
          <button
            type="button"
            className="btn-annule-rdv"
            onClick={handleCancelAppointment}
          >
            Annuler le rendez-vous
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ModifierRDV() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { appointments, loaded } = useAppointments();

  if (!loaded) {
    return (
      <main className="rdv-page">
        <p>Chargement...</p>
      </main>
    );
  }

  const appointment = appointments.find((a) => a.id === id);

  if (!appointment) {
    return (
      <main className="rdv-page">
        <h1>Rendez-vous introuvable</h1>
        <Link href="/patient/rendez-vous" className="rdv-back">
          ← Retour à la liste
        </Link>
      </main>
    );
  }

  // Seule une demande « En attente » est modifiable : accepté, le rendez-vous est figé.
  if (appointment.status !== "En attente") {
    return (
      <main className="rdv-page">
        <h1>Modification impossible</h1>
        <p>
          {appointment.status === "Accepté"
            ? "Ce rendez-vous a été confirmé par le médecin : il ne peut plus être modifié. Pour changer d'horaire, annulez-le depuis la liste puis reprenez rendez-vous."
            : `Ce rendez-vous est clôturé (${appointment.status}).`}
        </p>
        <Link href={`/patient/rendez-vous/${appointment.id}`} className="rdv-back">
          ← Retour au détail
        </Link>
      </main>
    );
  }

  return <ModifierForm appointment={appointment} />;
}
