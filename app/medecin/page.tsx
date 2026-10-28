"use client";

import Link from "next/link";
import { useState } from "react";
import KpiCard from "@/components/KpiCard";
import { CLOSED_STATUSES, STATUS_CLASSES } from "@/lib/appointments";
import { useAppointments } from "@/lib/useAppointments";
import { useFeedbacks } from "@/lib/feedbacks/useFeedbacks";
import { useStock } from "@/lib/stock/useStock";
import { feedbackRoutes } from "@/lib/roles";

const routes = feedbackRoutes("medecin");

/** Date du jour au format AAAA-MM-JJ (heure locale). */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function MedecinHomePage() {
  const [today] = useState(todayISO);

  // Les hooks ne renvoient déjà que les données du médecin connecté :
  // la page n'a besoin ni de l'utilisateur ni de filtrer.
  const { appointments, loaded: apptLoaded, error: apptError } = useAppointments();
  const { items: received, loading: fbLoading, error: fbError } = useFeedbacks();
  const { kpis: stockKpis, loading: stockLoading, error: stockError } = useStock();

  // ---- Rendez-vous
  const upcoming = appointments
    .filter((a) => a.status === "Accepté" && a.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const pending = appointments.filter((a) => a.status === "En attente");
  const closed = appointments.filter((a) => CLOSED_STATUSES.includes(a.status));

  // ---- Retours patients
  const complaints = received.filter((f) => f.type === "COMPLAINT");
  const toHandle = complaints.filter(
    (f) => f.status === "OPEN" || f.status === "IN_PROGRESS"
  );
  const reviews = received.filter((f) => f.type === "REVIEW" && f.rating);
  const average = reviews.length
    ? reviews.reduce((sum, f) => sum + (f.rating ?? 0), 0) / reviews.length
    : null;

  const a = apptLoaded ? undefined : "–"; // « – » tant que les données ne sont pas là
  const f = fbLoading ? "–" : undefined;
  const s = stockLoading ? "–" : undefined;

  const stockAlerts = stockKpis.lowStockCount + stockKpis.outOfStockCount;

  return (
    <main className="appointments-page">
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PROFESSIONNEL</span>
          <h1>Tableau de bord</h1>
          <p>Voici l&apos;état de votre activité.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/medecin/stock" className="btn-secondary text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors">
            Gérer le stock
          </Link>
          <Link href="/medecin/rendez-vous" className="btn-prendre-rdv">
            Gérer les rendez-vous
          </Link>
        </div>
      </header>

      {(apptError || fbError || stockError) && (
        <p className="text-sm text-red-600">{apptError || fbError || stockError}</p>
      )}

      <section aria-labelledby="kpi-rdv">
        <h2 id="kpi-rdv" className="dashboard-section-title">
          Rendez-vous
        </h2>
        <div className="kpi-grid">
          <KpiCard
            label="À venir"
            value={a ?? upcoming.length}
            hint="Acceptés, à partir d'aujourd'hui"
            tone="green"
            href="/medecin/rendez-vous"
          />
          <KpiCard
            label="En attente"
            value={a ?? pending.length}
            hint={pending.length > 0 ? "À accepter ou refuser" : "Aucune demande en cours"}
            tone="amber"
            href="/medecin/rendez-vous"
          />
          <KpiCard
            label="Clôturés"
            value={a ?? closed.length}
            hint="Terminés, refusés ou annulés"
            tone="slate"
            href="/medecin/rendez-vous"
          />
        </div>
      </section>

      <section aria-labelledby="kpi-feedback">
        <h2 id="kpi-feedback" className="dashboard-section-title">
          Retours des patients
        </h2>
        <div className="kpi-grid">
          <KpiCard
            label="Réclamations"
            value={f ?? complaints.length}
            hint={toHandle.length > 0 ? `${toHandle.length} à traiter` : "Aucune à traiter"}
            tone={toHandle.length > 0 ? "red" : "teal"}
            href={routes.list}
          />
          <KpiCard
            label="Avis reçus"
            value={f ?? reviews.length}
            hint="Notes laissées après consultation"
            tone="teal"
            href={routes.list}
          />
          <KpiCard
            label="Note moyenne"
            value={f ?? (average === null ? "–" : `${average.toFixed(1)} ★`)}
            hint={average === null ? "Pas encore d'avis" : "Sur 5"}
            tone="amber"
            href={routes.dashboard}
          />
        </div>
      </section>

      {/* Module 3 : Gestion du stock médical (Amira) */}
      <section aria-labelledby="kpi-stock">
        <div className="flex items-center justify-between mb-3">
          <h2 id="kpi-stock" className="dashboard-section-title mb-0">
            Stock médical &amp; Consommables
          </h2>
          <Link
            href="/medecin/stock"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
          >
            Accéder à l&apos;inventaire complet →
          </Link>
        </div>
        <div className="kpi-grid">
          <KpiCard
            label="Références en stock"
            value={s ?? stockKpis.totalItems}
            hint={`${stockKpis.totalQuantity} unités au total`}
            tone="teal"
            href="/medecin/stock"
          />
          <KpiCard
            label="Alertes stock &amp; ruptures"
            value={s ?? stockAlerts}
            hint={
              stockKpis.outOfStockCount > 0
                ? `${stockKpis.outOfStockCount} rupture(s) critique(s)`
                : stockKpis.lowStockCount > 0
                ? `${stockKpis.lowStockCount} article(s) à réapprovisionner`
                : "Stock optimal"
            }
            tone={stockKpis.outOfStockCount > 0 ? "red" : stockAlerts > 0 ? "amber" : "green"}
            href="/medecin/stock"
          />
          <KpiCard
            label="Alertes péremption"
            value={s ?? stockKpis.expiringCount}
            hint={
              stockKpis.expiredCount > 0
                ? `${stockKpis.expiredCount} lot(s) déjà périmé(s) !`
                : stockKpis.expiringCount > 0
                ? "Expire dans moins de 30 jours"
                : "Tous les lots sont valides"
            }
            tone={stockKpis.expiredCount > 0 ? "red" : stockKpis.expiringCount > 0 ? "amber" : "green"}
            href="/medecin/stock"
          />
        </div>
      </section>

      <section aria-labelledby="next-rdv">
        <h2 id="next-rdv" className="dashboard-section-title">
          Prochains rendez-vous
        </h2>

        {!apptLoaded ? (
          <p>Chargement…</p>
        ) : upcoming.length === 0 ? (
          <p className="dashboard-empty">Aucun rendez-vous accepté à venir.</p>
        ) : (
          <ul className="dashboard-list">
            {upcoming.slice(0, 5).map((appt) => (
              <li key={appt.id}>
                <span className="dashboard-list-date">
                  {formatDate(appt.date)} · {appt.time}
                </span>
                <span className="dashboard-list-main">
                  <strong>{appt.patientName}</strong>
                  <small>{appt.reason}</small>
                </span>
                <span className={`status-badge ${STATUS_CLASSES[appt.status]}`}>
                  {appt.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
