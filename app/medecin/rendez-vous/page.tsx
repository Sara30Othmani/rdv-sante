"use client";

import { useMemo, useState } from "react";
import {
  APPOINTMENT_STATUSES,
  CLOSED_STATUSES,
  STATUS_CLASSES,
  type Appointment,
} from "@/lib/appointments";
import { patchAppointment, useAppointments } from "@/lib/useAppointments";
import { useUser } from "@/lib/session";
import "../../style.css";
import "./rdv.css";

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MedecinRendezVousPage() {
  const user = useUser();
  const { appointments: mine, loaded, error } = useAppointments();

  const [filter, setFilter] = useState("Tous");
  const [message, setMessage] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () =>
      [...mine]
        .filter((a) => filter === "Tous" || a.status === filter)
        .sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        ),
    [mine, filter],
  );

  const countOf = (status: Appointment["status"]) =>
    mine.filter((a) => a.status === status).length;

  const noteOf = (a: Appointment) => notesDraft[a.id] ?? a.notes ?? "";

  async function update(
    id: string,
    changes: Parameters<typeof patchAppointment>[1],
    successMessage: string,
  ): Promise<boolean> {
    try {
      await patchAppointment(id, changes);
      setMessage(successMessage);
      return true;
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Impossible d'enregistrer les modifications.",
      );
      return false;
    }
  }

  async function saveNote() {
    if (!selectedAppointment) return;

    setSaving(true);

    const success = await update(
      selectedAppointment.id,
      { notes: noteOf(selectedAppointment) },
      "Note de consultation enregistrée avec succès.",
    );

    setSaving(false);

    if (success) {
      setSelectedAppointment(null);
    }
  }

  async function changeStatus(
    appointment: Appointment,
    status: Appointment["status"],
  ) {
    const messages: Record<string, string> = {
      Accepté: "Rendez-vous accepté.",
      Refusé: "Rendez-vous refusé.",
      Terminé: "Consultation marquée comme terminée.",
    };

    await update(appointment.id, { status }, messages[status]);
  }

  if (!loaded) {
    return (
      <main className="doctor-dashboard">
        <p className="doctor-loading">Chargement des rendez-vous...</p>
      </main>
    );
  }

  return (
    <main className="doctor-dashboard">
      <header className="doctor-dashboard-header">
        <div>
          <span className="doctor-dashboard-eyebrow">ESPACE PROFESSIONNEL</span>
          <h1>Gestion des rendez-vous</h1>
          <p>
            Bonjour {user.name}, consultez et gérez votre activité médicale.
          </p>
        </div>
      </header>

      {/* Indicateurs */}
      <section className="doctor-dashboard-stats">
        <div className="doctor-stat">
          <div className="doctor-stat-icon pending-icon">◷</div>
          <div>
            <span>En attente</span>
            <strong>{countOf("En attente")}</strong>
          </div>
        </div>

        <div className="doctor-stat">
          <div className="doctor-stat-icon accepted-icon">✓</div>
          <div>
            <span>Acceptés</span>
            <strong>{countOf("Accepté")}</strong>
          </div>
        </div>

        <div className="doctor-stat">
          <div className="doctor-stat-icon completed-icon">▣</div>
          <div>
            <span>Terminés</span>
            <strong>{countOf("Terminé")}</strong>
          </div>
        </div>
      </section>

      {/* Message de retour */}
      {error && <p className="doctor-error">{error}</p>}

      {message && (
        <div className="doctor-dashboard-message" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      {/* Tableau */}
      <section className="doctor-table-section">
        <div className="doctor-table-header">
          <div>
            <h2>Liste des rendez-vous</h2>
            <p>Suivez les demandes et les consultations de vos patients.</p>
          </div>

          <div className="doctor-table-filter">
            <label htmlFor="doctor-status-filter">Statut :</label>
            <select
              id="doctor-status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="Tous">Tous les rendez-vous</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="doctor-table-scroll">
          <table className="doctor-appointments-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Note</th>
                <th>Actions</th>
                <th>Ordonnance</th>
              </tr>
            </thead>

            <tbody>
              {visible.map((appointment) => {
                const isPending = appointment.status === "En attente";
                const isAccepted = appointment.status === "Accepté";
                const isDone = appointment.status === "Terminé";
                const isClosed = CLOSED_STATUSES.includes(appointment.status);

                return (
                  <tr key={appointment.id}>
                    <td>
                      <div className="doctor-patient-cell">
                        <div className="doctor-patient-avatar">
                          {appointment.patientName?.charAt(0)?.toUpperCase() ||
                            "P"}
                        </div>
                        <strong>{appointment.patientName}</strong>
                      </div>
                    </td>

                    <td>{formatDate(appointment.date)}</td>

                    <td>
                      <strong>{appointment.time}</strong>
                    </td>

                    <td className="doctor-reason-cell">
                      {appointment.reason || "Non renseigné"}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${STATUS_CLASSES[appointment.status]}`}
                      >
                        <span className="status-indicator" />
                        {appointment.status}
                      </span>

                      {appointment.status === "Annulé" &&
                        appointment.cancelReason && (
                          <p className="doctor-cancel-reason">
                            Motif : {appointment.cancelReason}
                          </p>
                        )}
                    </td>

                    <td>
                      {isAccepted || isDone ? (
                        <button
                          type="button"
                          className="doctor-note-button"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          {appointment.notes || notesDraft[appointment.id]
                            ? "Modifier la note"
                            : "Ajouter une note"}
                        </button>
                      ) : (
                        <span className="doctor-no-note">—</span>
                      )}
                    </td>

                    <td>
                      <div className="doctor-row-actions">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="doctor-table-accept"
                              onClick={() =>
                                changeStatus(appointment, "Accepté")
                              }
                            >
                              Accepter
                            </button>

                            <button
                              type="button"
                              className="doctor-table-reject"
                              onClick={() =>
                                changeStatus(appointment, "Refusé")
                              }
                            >
                              Refuser
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <button
                            type="button"
                            className="doctor-table-finish"
                            onClick={() => changeStatus(appointment, "Terminé")}
                          >
                            Terminer
                          </button>
                        )}

                        {isClosed && !isDone && (
                          <span className="doctor-closed-label">
                            Demande clôturée
                          </span>
                        )}

                        {isDone && (
                          <span className="doctor-completed-label">
                            Consultation terminée
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="doctor-prescription-cell">
                        <span className="doctor-prescription-status">
                          Aucune ordonnance
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="doctor-table-empty">
                      <span>▦</span>
                      <strong>Aucun rendez-vous trouvé</strong>
                      <p>Aucune demande ne correspond au filtre sélectionné.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="doctor-table-footer">
          <span>
            {visible.length} rendez-vous affiché{visible.length > 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Popup des notes */}
      {selectedAppointment && (
        <div
          className="doctor-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setSelectedAppointment(null);
            }
          }}
        >
          <section
            className="doctor-note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-modal-title"
          >
            <div className="doctor-modal-header">
              <div>
                <span className="doctor-modal-eyebrow">
                  DOSSIER DE CONSULTATION
                </span>
                <h2 id="doctor-modal-title">Note de consultation</h2>
                <p>
                  Patient : <strong>{selectedAppointment.patientName}</strong>
                </p>
              </div>

              <button
                type="button"
                className="doctor-modal-close"
                onClick={() => setSelectedAppointment(null)}
                disabled={saving}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="doctor-modal-details">
              <span>📅 {formatDate(selectedAppointment.date)}</span>
              <span>◷ {selectedAppointment.time}</span>
            </div>

            <label className="doctor-modal-label" htmlFor="consultation-note">
              Observations de la consultation
            </label>

            <textarea
              id="consultation-note"
              value={noteOf(selectedAppointment)}
              onChange={(e) =>
                setNotesDraft((prev) => ({
                  ...prev,
                  [selectedAppointment.id]: e.target.value,
                }))
              }
              rows={7}
              maxLength={2000}
              placeholder="Saisissez vos observations..."
              autoFocus
            />

            <div className="doctor-modal-counter">
              {noteOf(selectedAppointment).length}/2000 caractères
            </div>

            <div className="doctor-modal-actions">
              <button
                type="button"
                className="doctor-modal-cancel"
                onClick={() => setSelectedAppointment(null)}
                disabled={saving}
              >
                Annuler
              </button>

              <button
                type="button"
                className="doctor-modal-save"
                onClick={saveNote}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer la note"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
