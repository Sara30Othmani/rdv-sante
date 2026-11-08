"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APPOINTMENT_STATUSES,
  CLOSED_STATUSES,
  STATUS_CLASSES,
  type Appointment,
} from "@/lib/appointments";
import { patchAppointment, useAppointments } from "@/lib/useAppointments";
import { useUser } from "@/lib/session";
import { apiJson } from "@/lib/api";
import CreatePrescriptionModal from "@/components/prescriptions/CreatePrescriptionModal";
import PrescriptionPrintModal, { type PrescriptionData } from "@/components/prescriptions/PrescriptionPrintModal";
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

  // Ordonnances
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [createAppt, setCreateAppt] = useState<any | null>(null);
  const [printData, setPrintData] = useState<PrescriptionData | null>(null);

  const loadPrescriptions = async () => {
    try {
      const data = await apiJson<any[]>("/api/prescriptions");
      setPrescriptions(data);
    } catch {
      // Ignorer si pas connecté ou pas de prescription
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

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

  const handleOpenPrint = (p: any) => {
    setPrintData({
      id: p.id,
      patientName: p.patient?.name || "Patient",
      patientEmail: p.patient?.email,
      patientPhone: p.patient?.phone,
      doctorName: p.doctor?.name || user.name,
      specialty: p.appointment?.specialty || "Cabinet Médical",
      consultationDate: p.appointment?.date,
      issuedAt: p.issuedAt,
      validUntil: p.validUntil,
      status: p.status,
      items: p.items,
    });
  };

  return (
    <main className="appointments-page">
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PROFESSIONNEL MÉDECIN</span>
          <h1>Rendez-vous &amp; Consultations</h1>
          <p>
            Gérez vos demandes de consultations, vos notes cliniques et rédigez les ordonnances pour vos patients.
          </p>
        </div>
      </header>

      {message && (
        <div
          className="doctor-feedback-banner"
          role="status"
          aria-live="polite"
        >
          <span>ℹ</span>
          <span>{message}</span>
          <button
            type="button"
            className="doctor-feedback-close"
            onClick={() => setMessage("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {error && <p className="appointments-error">{error}</p>}

      <section className="doctor-appointments-card">
        <div className="doctor-toolbar">
          <div>
            <h2>Planning des consultations</h2>
            <p>
              {loaded ? `${mine.length} rendez-vous au total` : "Chargement…"}
            </p>
          </div>

          <div className="doctor-filter-group">
            <label htmlFor="doctor-status-filter">Filtrer par statut :</label>
            <select
              id="doctor-status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="Tous">Tous ({mine.length})</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status} ({countOf(status)})
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

                // Ordonnance existante pour ce rdv
                const apptPresc = prescriptions.find(
                  (p) => String(p.appointmentId) === String(appointment.id)
                );

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
                        {apptPresc ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(apptPresc)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center gap-1 border border-teal-200 shadow-2xs transition-colors"
                          >
                            <span>📄</span>
                            <span>Voir ordonnance</span>
                          </button>
                        ) : isDone || isAccepted ? (
                          <button
                            type="button"
                            onClick={() => setCreateAppt(appointment)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1 border border-emerald-200 shadow-2xs transition-colors"
                          >
                            <span>✏️</span>
                            <span>Rédiger ordonnance</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={8}>
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

      {/* Modal Création Ordonnance */}
      <CreatePrescriptionModal
        isOpen={Boolean(createAppt)}
        onClose={() => setCreateAppt(null)}
        appointment={createAppt}
        onCreated={() => {
          setCreateAppt(null);
          loadPrescriptions();
          setMessage("Ordonnance délivrée avec succès.");
        }}
      />

      {/* Modal Impression Ordonnance */}
      <PrescriptionPrintModal
        isOpen={Boolean(printData)}
        onClose={() => setPrintData(null)}
        data={printData}
      />

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
