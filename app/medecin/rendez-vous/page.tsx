"use client";

import { useState } from "react";
import {
  APPOINTMENT_STATUSES,
  CLOSED_STATUSES,
  STATUS_CLASSES,
  type Appointment,
} from "@/lib/appointments";
import { patchAppointment, useAppointments } from "@/lib/useAppointments";
import { useUser } from "@/lib/session";

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MedecinRendezVousPage() {
  const user = useUser();
  // L'API ne renvoie que les rendez-vous de ce médecin
  const { appointments: mine, loaded, error } = useAppointments();

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("Tous");
  const [message, setMessage] = useState("");

  const visible = mine
    .filter((a) => filter === "Tous" || a.status === filter)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const countOf = (status: Appointment["status"]) =>
    mine.filter((a) => a.status === status).length;

  async function update(
    id: string,
    changes: Parameters<typeof patchAppointment>[1],
    successMessage: string
  ) {
    try {
      await patchAppointment(id, changes);
      setMessage(successMessage);
    } catch (e) {
      setMessage((e as Error).message || "Impossible d'enregistrer les modifications.");
    }
  }

  const noteOf = (a: Appointment) => notesDraft[a.id] ?? a.notes;

  if (!loaded) {
    return (
      <main className="appointments-page">
        <p>Chargement...</p>
      </main>
    );
  }

  return (
    <main className="appointments-page">
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PROFESSIONNEL</span>
          <h1>Gestion des rendez-vous</h1>
          <p>
            Bonjour {user.name}, retrouvez vos demandes et le suivi de vos
            consultations.
          </p>
        </div>
      </header>

      <section className="appointment-kpis">
        <div className="kpi-pill kpi-total">
          <span className="kpi-dot" />
          <span className="kpi-label">Demandes en attente</span>
          <strong>{countOf("En attente")}</strong>
        </div>
        <div className="kpi-pill kpi-open">
          <span className="kpi-dot" />
          <span className="kpi-label">Rendez-vous acceptés</span>
          <strong>{countOf("Accepté")}</strong>
        </div>
        <div className="kpi-pill kpi-closed">
          <span className="kpi-dot" />
          <span className="kpi-label">Consultations terminées</span>
          <strong>{countOf("Terminé")}</strong>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {message && (
        <div className="doctor-feedback" role="status" aria-live="polite">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      )}

      <section className="appointments-toolbar">
        <div className="filter-container">
          <label htmlFor="doctor-status-filter">Filtrer par statut</label>
          <select
            id="doctor-status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="Tous">Tous les rendez-vous</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="appointments-result-count">{visible.length} rendez-vous</p>
      </section>

      {visible.length === 0 ? (
        <section className="appointments-empty">
          <div className="empty-icon">▦</div>
          <h2>Aucun rendez-vous</h2>
          <p>Aucune demande ne correspond au filtre sélectionné.</p>
        </section>
      ) : (
        <section className="appointments-list">
          {visible.map((appointment) => {
            const isPending = appointment.status === "En attente";
            const isAccepted = appointment.status === "Accepté";
            const isDone = appointment.status === "Terminé";
            const isClosed = CLOSED_STATUSES.includes(appointment.status);
            const date = new Date(`${appointment.date}T12:00:00`);

            return (
              <article
                key={appointment.id}
                className="appointment-card doctor-appointment-card"
              >
                <div className="appointment-date-block">
                  <span className="appointment-date-month">
                    {date.toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                  <strong className="appointment-date-day">
                    {date.toLocaleDateString("fr-FR", { day: "2-digit" })}
                  </strong>
                  <span className="appointment-date-year">
                    {appointment.date.slice(0, 4)}
                  </span>
                </div>

                <div className="appointment-doctor">
                  <span className="appointment-section-label">PATIENT</span>
                  <h3>{appointment.patientName}</h3>
                  <p className="appointment-specialty">
                    {appointment.reason || "Motif non renseigné"}
                  </p>
                  <span
                    className={`status-badge ${STATUS_CLASSES[appointment.status]}`}
                  >
                    <span className="status-indicator" />
                    {appointment.status}
                  </span>
                </div>

                <div className="appointment-details">
                  <div className="appointment-detail-item">
                    <span className="detail-label">Date</span>
                    <strong>{formatDate(appointment.date)}</strong>
                  </div>
                  <div className="appointment-detail-item">
                    <span className="detail-label">Heure</span>
                    <strong>{appointment.time}</strong>
                  </div>
                  <div className="appointment-detail-item">
                    <span className="detail-label">Note de consultation</span>
                    <strong>
                      {appointment.notes ? "Note enregistrée" : "Aucune note"}
                    </strong>
                  </div>
                </div>

                <div className="doctor-appointment-actions">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        className="doctor-action-accept"
                        onClick={() =>
                          update(appointment.id, { status: "Accepté" }, "Rendez-vous accepté.")
                        }
                      >
                        ✓ Accepter
                      </button>
                      <button
                        type="button"
                        className="doctor-action-reject"
                        onClick={() =>
                          update(appointment.id, { status: "Refusé" }, "Rendez-vous refusé.")
                        }
                      >
                        ✕ Refuser
                      </button>
                    </>
                  )}

                  {isAccepted && (
                    <button
                      type="button"
                      className="doctor-action-accept"
                      onClick={() =>
                        update(
                          appointment.id,
                          { status: "Terminé" },
                          "Consultation marquée comme terminée."
                        )
                      }
                    >
                      ✓ Terminer
                    </button>
                  )}

                  {isClosed && (
                    <span className="closed-message">Demande clôturée</span>
                  )}
                </div>

                {/* Notes après consultation */}
                {(isAccepted || isDone) && (
                  <div className="doctor-notes">
                    <label htmlFor={`note-${appointment.id}`}>
                      Notes de consultation
                    </label>

                    <textarea
                      id={`note-${appointment.id}`}
                      value={noteOf(appointment)}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({
                          ...prev,
                          [appointment.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      maxLength={2000}
                      placeholder="Ajouter les observations de la consultation..."
                    />

                    <div className="doctor-notes-footer">
                      <span>{noteOf(appointment).length}/2000</span>
                      <button
                        type="button"
                        className="doctor-action-save"
                        onClick={() =>
                          update(
                            appointment.id,
                            { notes: noteOf(appointment) },
                            "Note de consultation enregistrée."
                          )
                        }
                      >
                        Enregistrer la note
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
