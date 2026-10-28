"use client";

import { getDB } from "../db";
import { apiFetch, apiJson } from "../api";
import { getSessionUser } from "../session";
import type { Feedback } from "./types";
import { validate, canChangeStatus, canView } from "./rules";

// ---------------------------------------------------------------------------
// Principe « hors-ligne d'abord » :
//  - toutes les écritures vont d'abord dans IndexedDB (instantané, marche sans réseau) ;
//  - syncPending() envoie ensuite les changements à l'API (MongoDB) et récupère
//    la version du serveur, qui fait foi.
// ---------------------------------------------------------------------------

export type NewFeedback = Omit<
  Feedback,
  "id" | "created_at" | "updated_at" | "status" | "syncStatus"
>;

/** Lance une synchronisation sans bloquer l'interface (échec = on réessaiera). */
const syncInBackground = () => {
  syncPending().catch((e) => console.warn("Synchronisation reportée :", e));
};

export async function createFeedback(data: NewFeedback) {
  const errors = validate(data);
  if (errors.length) throw new Error(errors.join("\n"));

  const db = await getDB();

  if (data.type === "REVIEW") {
    const all = await db.getAll("feedbacks");
    if (all.some((f) => f.type === "REVIEW" && f.appointment_id === data.appointment_id))
      throw new Error("Un avis existe déjà pour ce rendez-vous.");
  }

  const now = new Date().toISOString();
  const fb: Feedback = {
    ...data,
    id: crypto.randomUUID(),
    status: "OPEN",
    created_at: now,
    updated_at: now,
    syncStatus: "pending",
  };

  await db.put("feedbacks", fb);
  syncInBackground();
  return fb;
}

export const listFeedbacks = async () => (await getDB()).getAll("feedbacks");

/** Cherche en local, puis sur le serveur (lien ouvert sur un nouvel appareil). */
export async function getFeedback(id: string) {
  const db = await getDB();
  const local = await db.get("feedbacks", id);
  if (local) return local;

  try {
    const remote = await apiJson<Feedback>(`/api/feedbacks/${encodeURIComponent(id)}`);
    await db.put("feedbacks", remote);
    return remote;
  } catch {
    return undefined;
  }
}

export async function updateFeedback(id: string, patch: Partial<Feedback>) {
  const db = await getDB();
  const old = await db.get("feedbacks", id);
  if (!old) throw new Error("Feedback introuvable.");

  const next: Feedback = {
    ...old,
    ...patch,
    updated_at: new Date().toISOString(),
    syncStatus: "pending",
  };

  const errors = validate(next);
  if (errors.length) throw new Error(errors.join("\n"));

  await db.put("feedbacks", next);
  syncInBackground();
  return next;
}

export async function respond(id: string, response: string) {
  if (response.trim().length < 3) throw new Error("Réponse trop courte.");

  const fb = await getFeedback(id);
  if (!fb) throw new Error("Feedback introuvable.");

  return updateFeedback(id, {
    response,
    status:
      fb.type === "COMPLAINT" && fb.status === "OPEN" ? "IN_PROGRESS" : fb.status,
  });
}

export async function changeStatus(id: string, to: Feedback["status"]) {
  const fb = await getFeedback(id);
  if (!fb || !canChangeStatus(fb.status, to)) throw new Error("Transition interdite.");

  return updateFeedback(id, { status: to });
}

export async function deleteFeedback(id: string) {
  const db = await getDB();
  await db.delete("feedbacks", id);
  await db.put("deleted", { id }); // à supprimer aussi sur le serveur
  syncInBackground();
}

// ---------------------------------------------------------------------------
// Synchronisation
// ---------------------------------------------------------------------------

async function runSync() {
  const user = getSessionUser();
  if (!user) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const db = await getDB();

  // 1) Suppressions en attente
  for (const { id } of await db.getAll("deleted")) {
    const res = await apiFetch(`/api/feedbacks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    // 404 : jamais arrivé sur le serveur ; 403 : interdit → on abandonne
    if (res.ok || res.status === 404 || res.status === 403) await db.delete("deleted", id);
    else if (res.status >= 500) throw new Error(`Serveur indisponible (${res.status})`);
  }

  // 2) Envoi des créations / modifications
  const rejected = new Set<string>();
  for (const f of await db.getAll("feedbacks")) {
    if (f.syncStatus !== "pending" || !canView(f, user.id, user.role)) continue;

    const res = await apiFetch(`/api/feedbacks/${encodeURIComponent(f.id)}`, {
      method: "PUT",
      body: JSON.stringify(f),
    });

    if (res.ok) await db.put("feedbacks", (await res.json()) as Feedback);
    else if (res.status >= 500) throw new Error(`Serveur indisponible (${res.status})`);
    else rejected.add(f.id); // refusé par les règles du serveur : on reprendra sa version
  }

  // 3) Récupération : le serveur fait foi
  const remote = await apiJson<Feedback[]>("/api/feedbacks");
  const remoteIds = new Set(remote.map((r) => r.id));

  for (const r of remote) {
    const local = await db.get("feedbacks", r.id);
    if (!local || local.syncStatus !== "pending" || rejected.has(r.id)) {
      await db.put("feedbacks", r);
    }
  }

  // Supprimés ailleurs (ou refusés à la création) : on les retire du cache local
  for (const l of await db.getAll("feedbacks")) {
    if (!canView(l, user.id, user.role) || remoteIds.has(l.id)) continue;
    if (l.syncStatus === "synced" || rejected.has(l.id)) await db.delete("feedbacks", l.id);
  }
}

// Une seule synchronisation à la fois : les appels suivants attendent la précédente.
let queue: Promise<void> = Promise.resolve();

export function syncPending(): Promise<void> {
  const run = queue.catch(() => undefined).then(runSync);
  queue = run;
  return run;
}
