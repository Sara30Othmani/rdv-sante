"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CLOSED_STATUSES, STATUS_CLASSES } from "@/lib/appointments";
import { useAppointments } from "@/lib/useAppointments";

const LIST_URL = "/patient/rendez-vous";

export default function ConsulterRDV() {
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

  // L'API ne renvoie que les rendez-vous du patient connecté
  const appointment = appointments.find((a) => a.id === id);

  if (!appointment) {
    return (
      <main className="rdv-page">
        <h1>Rendez-vous introuvable</h1>
        <Link href={LIST_URL} className="rdv-back">
          ← Retour à la liste
        </Link>
      </main>
    );
  }

  const isClosed = CLOSED_STATUSES.includes(appointment.status);

  return (
    <main className="rdv-page">
      <Link href={LIST_URL} className="rdv-back">
        ← Retour à la liste
      </Link>

      <h1>Détail du rendez-vous</h1>

      <article className="rdv-card">
        <h2>{appointment.doctorName}</h2>

        <dl className="rdv-info">
          <div>
            <dt>Spécialité</dt>
            <dd>{appointment.specialty}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{appointment.date}</dd>
          </div>
          <div>
            <dt>Heure</dt>
            <dd>{appointment.time}</dd>
          </div>
          <div>
            <dt>Motif</dt>
            <dd>{appointment.reason}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>
              <span className={`status-badge ${STATUS_CLASSES[appointment.status]}`}>
                {appointment.status}
              </span>
            </dd>
          </div>
          <div>
            <dt>Notes de consultation</dt>
            <dd>{appointment.notes || "Aucune note disponible"}</dd>
          </div>
        </dl>

        <div className="rdv-actions">
          {!isClosed && (
            <Link
              href={`/patient/rendez-vous/${appointment.id}/modifier`}
              className="btn-prendre-rdv"
            >
              Modifier ce rendez-vous
            </Link>
          )}
          {appointment.status === "Terminé" && (
            <Link href="/patient/feedbacks/form" className="btn-secondary">
              Laisser un avis
            </Link>
          )}
        </div>
      </article>
    </main>
  );
}
