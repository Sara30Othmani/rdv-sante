"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import KpiCard from "@/components/KpiCard";
import PrescriptionDialog from "@/components/PrescriptionDialog";
import {
  CLOSED_STATUSES,
  STATUS_CLASSES,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/appointments";
import { patchAppointment, useAppointments } from "@/lib/useAppointments";
import "./RDV.css";


const PAGE_SIZE = 6;
const MIN_REASON = 5;
const MAX_REASON = 500;

/** Phrase qui explique le statut au patient (et ce qu'il peut faire). */
const STATUS_HINT: Record<AppointmentStatus, string> = {
  "En attente": "En attente de confirmation par le médecin",
  Accepté: "Confirmé par le médecin",
  Refusé: "Refusé par le médecin",
  Annulé: "Annulé",
  Terminé: "Consultation terminée",
};

const FILTERS = [
  { key: "ALL", label: "Tous", statuses: null },
  { key: "PENDING", label: "En attente", statuses: ["En attente"] },
  { key: "ACCEPTED", label: "Confirmés", statuses: ["Accepté"] },
  { key: "DONE", label: "Terminés", statuses: ["Terminé"] },
  { key: "OTHER", label: "Annulés / refusés", statuses: ["Annulé", "Refusé"] },
] as const satisfies readonly {
  key: string;
  label: string;
  statuses: readonly AppointmentStatus[] | null;
}[];

type FilterKey = (typeof FILTERS)[number]["key"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const asDate = (date: string) => new Date(`${date}T12:00:00`);
const byDateAsc = (a: Appointment, b: Appointment) =>
  `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
const isOpen = (a: Appointment) => !CLOSED_STATUSES.includes(a.status);

/** [1, "…", 4, 5, 6, "…", 12] : toutes les pages si peu, sinon une fenêtre autour de la page courante. */
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Fenêtre modale : le patient doit indiquer pourquoi il annule. */
function CancelDialog({
  appointment: a,
  onClose,
  onDone,
}: {
  appointment: Appointment;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // La fenêtre s'ouvre dès qu'elle est affichée (Échap et focus gérés par <dialog>)
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = reason.trim();
    if (text.length < MIN_REASON) {
      setError(`Indiquez le motif de l'annulation (${MIN_REASON} caractères minimum).`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await patchAppointment(a.id, { status: "Annulé", cancelReason: text });
      onDone("Rendez-vous annulé.");
    } catch (err) {
      setError((err as Error).message || "Annulation impossible.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="myrdv-dialog"
      aria-labelledby="cancel-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose(); // clic sur le fond
      }}
    >
      <form className="myrdv-dialog-body" onSubmit={submit}>
        <h2 id="cancel-title">Annuler le rendez-vous</h2>
        <p className="myrdv-dialog-summary">
          {a.doctorName} · {asDate(a.date).toLocaleDateString("fr-FR", { dateStyle: "long" })} à{" "}
          {a.time}
        </p>

        <label htmlFor="cancel-reason">Pourquoi annulez-vous ce rendez-vous ?</label>
        <textarea
          id="cancel-reason"
          rows={4}
          maxLength={MAX_REASON}
          required
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. : empêchement de dernière minute, rendez-vous pris ailleurs…"
        />
        <small>
          {reason.length}/{MAX_REASON} caractères · le médecin pourra lire ce motif
        </small>

        {error && <p className="myrdv-dialog-error">{error}</p>}

        <div className="myrdv-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Retour
          </button>
          <button type="submit" className="myrdv-danger" disabled={saving}>
            {saving ? "Annulation…" : "Confirmer l'annulation"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function AppointmentTableRow({
  appointment: a,
  onCancel,
  onPrescription,
}: {
  appointment: Appointment;
  onCancel: (a: Appointment) => void;
  onPrescription: (a: Appointment) => void;
}) {
  const date = asDate(a.date);
  const canEdit = a.status === "En attente"; // accepté = horaire figé
  const canCancel = a.status === "En attente" || a.status === "Accepté";

  return (
    <tr>
      <td data-label="Date et heure">
        <div className="myrdv-when">
          <strong>
            {date.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </strong>
          <span>{a.time}</span>
        </div>
      </td>

      <td data-label="Médecin">
        <div className="myrdv-who">
          <strong>{a.doctorName}</strong>
          <span>{a.specialty}</span>
        </div>
      </td>

      <td data-label="Motif">
        <span className="myrdv-reason" title={a.reason}>
          {a.reason}
        </span>
      </td>

      <td data-label="Statut">
        <span className={`status-badge ${STATUS_CLASSES[a.status]}`} title={STATUS_HINT[a.status]}>
          {a.status}
        </span>
        {a.status === "En attente" && <small className="myrdv-sub">À confirmer par le médecin</small>}
        {a.status === "Accepté" && <small className="myrdv-sub">Horaire figé</small>}
        {a.status === "Annulé" && a.cancelReason && (
          <small className="myrdv-sub" title={a.cancelReason}>
            Motif : {a.cancelReason}
          </small>
        )}
      </td>

      <td data-label="Actions">
        <div className="myrdv-row-actions">
          <Link href={`/patient/rendez-vous/${a.id}`} className="myrdv-btn">
            Consulter
          </Link>

          {canEdit && (
            <Link href={`/patient/rendez-vous/${a.id}/modifier`} className="myrdv-btn myrdv-btn--primary">
              Modifier
            </Link>
          )}

          {a.status === "Terminé" && (
            <>
              <button
                type="button"
                className="myrdv-btn myrdv-btn--primary"
                onClick={() => onPrescription(a)}
              >
                Ordonnance
              </button>
              <Link href="/patient/feedbacks/form" className="myrdv-btn">
                Avis
              </Link>
            </>
          )}

          {a.status === "Refusé" && (
            <Link
              href={`/patient/rendez-vous/nouveau?doctorId=${a.doctorId}`}
              className="myrdv-btn myrdv-btn--primary"
            >
              Reprendre
            </Link>
          )}

          {canCancel && (
            <button type="button" className="myrdv-btn myrdv-btn--danger" onClick={() => onCancel(a)}>
              Annuler
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function MesRendezVousPage() {
  // L'API ne renvoie déjà que les rendez-vous du patient connecté
  const { appointments, loaded, error } = useAppointments();
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [page, setPage] = useState(1);
  const [today] = useState(todayISO);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [prescription, setPrescription] = useState<Appointment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function changeFilter(key: FilterKey) {
    setFilter(key);
    setPage(1);
  }

  function goToPage(n: number) {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!loaded) {
    return (
      <main className="appointments-page">
        <p>Chargement de vos rendez-vous...</p>
      </main>
    );
  }

  const countOf = (statuses: readonly AppointmentStatus[] | null) =>
    statuses
      ? appointments.filter((a) => statuses.includes(a.status)).length
      : appointments.length;

  const currentFilter = FILTERS.find((f) => f.key === filter)!;
  const shown = appointments.filter(
    (a) =>
      !currentFilter.statuses ||
      (currentFilter.statuses as readonly AppointmentStatus[]).includes(a.status)
  );

  // « En cours » : du plus proche au plus lointain. « Historique » : du plus récent au plus ancien.
  const upcoming = shown.filter(isOpen).sort(byDateAsc);
  const history = shown.filter((a) => !isOpen(a)).sort((a, b) => byDateAsc(b, a));
  const ordered = [...upcoming, ...history];

  // Pagination : 6 rendez-vous par page
  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages); // si la dernière page se vide après une annulation
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = ordered.slice(start, start + PAGE_SIZE);

  const next = appointments
    .filter((a) => isOpen(a) && a.date >= today)
    .sort(byDateAsc)[0];

  return (
    <main className="appointments-page">
      <header className="appointments-header">
        <div>
          <h1>Mes rendez-vous</h1>
          <p>Suivez vos consultations et leur statut.</p>
        </div>
        <Link href="/patient" className="btn-prendre-rdv">
          + Prendre rendez-vous
        </Link>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="kpi-grid" aria-label="Résumé">
        <KpiCard
          label="Prochain rendez-vous"
          value={
            next
              ? `${asDate(next.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })} · ${next.time}`
              : "Aucun"
          }
          hint={
            next ? `${next.doctorName} · ${next.status.toLowerCase()}` : "Aucun rendez-vous à venir"
          }
          tone="teal"
        />
        <KpiCard
          label="En attente"
          value={countOf(["En attente"])}
          hint="À confirmer par le médecin"
          tone="amber"
        />
        <KpiCard label="Confirmés" value={countOf(["Accepté"])} hint="Horaire figé" tone="green" />
        <KpiCard
          label="Terminés"
          value={countOf(["Terminé"])}
          hint="Vous pouvez laisser un avis"
          tone="slate"
        />
      </section>

      <nav className="myrdv-chips" aria-label="Filtrer par statut">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`myrdv-chip ${filter === f.key ? "is-active" : ""}`}
            aria-pressed={filter === f.key}
            onClick={() => changeFilter(f.key)}
          >
            {f.label}
            <span className="myrdv-chip-count">{countOf(f.statuses)}</span>
          </button>
        ))}
      </nav>

      {notice && (
        <p className="myrdv-notice" role="status" aria-live="polite">
          {notice}
        </p>
      )}

      {ordered.length === 0 ? (
        <section className="appointments-empty">
          <div className="empty-icon">▣</div>
          <h2>{appointments.length === 0 ? "Aucun rendez-vous" : "Rien dans cette catégorie"}</h2>
          <p>
            {appointments.length === 0
              ? "Vous n'avez pas encore pris de rendez-vous."
              : "Aucun rendez-vous ne correspond à ce filtre."}
          </p>
          {appointments.length === 0 ? (
            <Link href="/patient" className="btn-prendre-rdv">
              Choisir un médecin
            </Link>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => changeFilter("ALL")}>
              Voir tous les rendez-vous
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="myrdv-table-wrap">
            <table className="myrdv-table">
              <caption className="sr-only">Liste de vos rendez-vous</caption>
              <thead>
                <tr>
                  <th scope="col">Date et heure</th>
                  <th scope="col">Médecin</th>
                  <th scope="col">Motif</th>
                  <th scope="col">Statut</th>
                  <th scope="col" className="is-actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a, i) => {
                  const open = isOpen(a);
                  // Ligne de titre au début de la page, puis à chaque changement de groupe
                  const showTitle = i === 0 || isOpen(pageItems[i - 1]) !== open;
                  return (
                    <Fragment key={a.id}>
                      {showTitle && (
                        <tr className="myrdv-group-row">
                          <th colSpan={5} scope="colgroup">
                            {open ? "En cours" : "Historique"}
                            <span>{open ? upcoming.length : history.length}</span>
                          </th>
                        </tr>
                      )}
                      <AppointmentTableRow
                        appointment={a}
                        onCancel={setCancelling}
                        onPrescription={setPrescription}
                      />
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav className="myrdv-pagination" aria-label="Pagination">
            <p>
              Rendez-vous {start + 1}–{start + pageItems.length} sur {ordered.length}
            </p>

            {totalPages > 1 && (
              <div className="myrdv-pages">
                <button
                  type="button"
                  className="myrdv-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  ← Précédent
                </button>

                {pageList(currentPage, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="myrdv-page-gap" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`myrdv-page-btn ${p === currentPage ? "is-active" : ""}`}
                      aria-current={p === currentPage ? "page" : undefined}
                      aria-label={`Page ${p}`}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="myrdv-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Suivant →
                </button>
              </div>
            )}
          </nav>
        </>
      )}

      {prescription && (
        <PrescriptionDialog appointment={prescription} onClose={() => setPrescription(null)} />
      )}

      {cancelling && (
        <CancelDialog
          appointment={cancelling}
          onClose={() => setCancelling(null)}
          onDone={(message) => {
            setCancelling(null);
            setNotice(message);
          }}
        />
      )}
    </main>
  );
}
