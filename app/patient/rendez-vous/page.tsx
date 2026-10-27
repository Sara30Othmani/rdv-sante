"use client";

import { useState } from "react";
import Link from "next/link";
import {
  APPOINTMENT_STATUSES,
  CLOSED_STATUSES,
  STATUS_CLASSES,
} from "@/lib/appointments";
import { useAppointments } from "@/lib/useAppointments";

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MesRendezVousPage() {
  // L'API ne renvoie déjà que les rendez-vous du patient connecté
  const { appointments: all, loaded, error } = useAppointments();
  const [filter, setFilter] = useState("Tous");

  // Un patient ne voit que SES rendez-vous
  const appointments = [...all].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  const filtered =
    filter === "Tous" ? appointments : appointments.filter((a) => a.status === filter);

  const openCount = appointments.filter(
    (a) => !CLOSED_STATUSES.includes(a.status)
  ).length;

  if (!loaded) {
    return (
      <main className="appointments-page">
        <p>Chargement de vos rendez-vous...</p>
      </main>
    );
  }

  return (
    <main className="appointments-page">
      <header className="appointments-header">
        <div>
          <h1>Mes rendez-vous</h1>
          <p>Consultez vos consultations et suivez leur statut.</p>
        </div>
        <Link href="/patient" className="btn-prendre-rdv">
          + Prendre rendez-vous
        </Link>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="appointment-kpis">
        <div className="kpi-pill kpi-total">
          <span className="kpi-dot" />
          <span className="kpi-label">Total des rendez-vous</span>
          <strong>{appointments.length}</strong>
        </div>
        <div className="kpi-pill kpi-open">
          <span className="kpi-dot" />
          <span className="kpi-label">Rendez-vous ouverts</span>
          <strong>{openCount}</strong>
        </div>
        <div className="kpi-pill kpi-closed">
          <span className="kpi-dot" />
          <span className="kpi-label">Rendez-vous fermés</span>
          <strong>{appointments.length - openCount}</strong>
        </div>
      </section>

      <section className="appointments-toolbar">
        <div className="filter-container">
          <label htmlFor="status-filter">Filtrer par statut</label>
          <select
            id="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="Tous">Tous les statuts</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="appointments-result-count">
          {filtered.length} rendez-vous affiché(s)
        </p>
      </section>

      {filtered.length === 0 ? (
        <section className="appointments-empty">
          <div className="empty-icon">▣</div>
          <h2>Aucun rendez-vous trouvé</h2>
          <p>
            {appointments.length === 0
              ? "Vous n'avez pas encore pris de rendez-vous."
              : "Aucun rendez-vous ne correspond à ce filtre."}
          </p>
          {appointments.length === 0 && (
            <Link href="/patient" className="btn-prendre-rdv">
              Choisir un médecin
            </Link>
          )}
        </section>
      ) : (
        <section className="appointments-list">
          {filtered.map((appointment) => {
            const isClosed = CLOSED_STATUSES.includes(appointment.status);

            return (
              <article key={appointment.id} className="appointment-card">
                <div className="appointment-card-main">
                  <div className="appointment-doctor-icon">✚</div>
                  <div className="appointment-doctor">
                    <h3>{appointment.doctorName}</h3>
                    <p>{appointment.specialty}</p>
                    <span
                      className={`status-badge ${STATUS_CLASSES[appointment.status]}`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>

                <div className="appointment-details">
                  <div>
                    <span className="detail-label">Date</span>
                    <strong>{formatDate(appointment.date)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Heure</span>
                    <strong>{appointment.time}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Motif</span>
                    <strong>{appointment.reason}</strong>
                  </div>
                </div>

                <div className="appointment-actions">
                  <Link
                    href={`/patient/rendez-vous/${appointment.id}`}
                    className="btn-secondary"
                  >
                    Consulter
                  </Link>

                  {!isClosed ? (
                    <Link
                      href={`/patient/rendez-vous/${appointment.id}/modifier`}
                      className="btn-prendre-rdv"
                    >
                      Modifier
                    </Link>
                  ) : (
                    <span className="closed-message">Rendez-vous fermé</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
