"use client";

import Link from "next/link";
import { useUser } from "@/lib/session";
import { useFeedbacks } from "@/lib/feedbacks/useFeedbacks";
import { useDoctors } from "@/lib/useAppointments";
import { canView } from "@/lib/feedbacks/rules";
import type { FeedbackStatus } from "@/lib/feedbacks/types";
import { ROLE_BY_SEGMENT, feedbackRoutes, type RoleSegment } from "@/lib/roles";
import { STATUS_LABEL } from "./StatusBadge";

const STATUSES: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function FeedbackDashboard({ segment }: { segment: RoleSegment }) {
  const user = useUser();
  const role = ROLE_BY_SEGMENT[segment];
  const routes = feedbackRoutes(segment);
  const { items, loading, error } = useFeedbacks();
  const { doctors: allDoctors } = useDoctors();

  // Réclamations visibles par ce profil (les siennes, ou celles reçues)
  const complaints = items.filter(
    (f) => f.type === "COMPLAINT" && canView(f, user.id, role)
  );
  const count = (status: FeedbackStatus) =>
    complaints.filter((f) => f.status === status).length;

  // Un médecin ne voit que sa propre note ; un patient voit celle de tous les médecins.
  const doctors = allDoctors.filter((d) => segment !== "medecin" || d.id === user.id);

  return (
    <main className="space-y-7">
      <h1 className="text-2xl font-bold">Bonjour, {user.name}</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={routes.list}
          className="rounded-lg bg-sky-600 px-4 py-3 text-center text-white"
        >
          Voir les feedbacks
        </Link>

        {segment === "patient" && (
          <Link
            href={routes.form()}
            className="rounded-lg border border-sky-600 px-4 py-3 text-center text-sky-700"
          >
            + Nouvel avis / réclamation
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 font-semibold">Suivi des réclamations</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATUSES.map((status) => (
            <div key={status} className="rounded-xl border bg-white p-4 text-center">
              <p className="text-3xl font-bold">{loading ? "–" : count(status)}</p>
              <p className="text-xs text-gray-500">{STATUS_LABEL[status]}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">
          {segment === "medecin" ? "Ma note moyenne" : "Note moyenne par médecin"}
        </h2>

        <ul className="grid gap-2 sm:grid-cols-2">
          {doctors.map((doctor) => (
            <li
              key={doctor.id}
              className="flex justify-between rounded-lg border bg-white p-3"
            >
              <span>
                {doctor.name}
                <span className="text-xs text-gray-500"> ({doctor.specialty})</span>
              </span>
              <span className="font-semibold text-amber-500">
                {doctor.ratingAvg === null
                  ? "Pas d'avis"
                  : `${doctor.ratingAvg.toFixed(1)} ★ (${doctor.ratingCount})`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
