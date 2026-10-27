"use client";

import Link from "next/link";
import { useUser } from "@/lib/session";
import { useFeedbacks } from "@/lib/feedbacks/useFeedbacks";
import { canView } from "@/lib/feedbacks/rules";
import { ROLE_BY_SEGMENT, feedbackRoutes, type RoleSegment } from "@/lib/roles";
import { useState } from "react";
import FeedbackCard from "./FeedbackCard";

const TITLE: Record<RoleSegment, string> = {
  patient: "Mes feedbacks & réclamations",
  medecin: "Feedbacks reçus",
};

export default function FeedbackList({ segment }: { segment: RoleSegment }) {
  const user = useUser();
  const role = ROLE_BY_SEGMENT[segment];
  const routes = feedbackRoutes(segment);
  const { items, loading, error } = useFeedbacks();

  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const visible = items
    .filter((f) => canView(f, user.id, role))
    .filter((f) => type === "ALL" || f.type === type)
    .filter((f) => status === "ALL" || f.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="space-y-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={routes.dashboard} className="text-sm text-sky-700">
            ← Tableau de bord
          </Link>
          <h1 className="mt-1 text-xl font-bold">{TITLE[segment]}</h1>
        </div>

        {segment === "patient" && (
          <Link
            href={routes.form()}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white"
          >
            + Nouveau
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filtrer par type"
          className="flex-1 rounded border bg-white p-2"
        >
          <option value="ALL">Tous les types</option>
          <option value="REVIEW">Avis</option>
          <option value="COMPLAINT">Réclamations</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrer par statut"
          className="flex-1 rounded border bg-white p-2"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="OPEN">Ouverte</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="RESOLVED">Résolue</option>
          <option value="CLOSED">Clôturée</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-gray-500">Chargement…</p>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-gray-500">Aucun feedback trouvé.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <FeedbackCard key={f.id} f={f} segment={segment} />
          ))}
        </div>
      )}
    </main>
  );
}
