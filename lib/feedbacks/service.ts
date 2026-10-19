import { getDB } from "../db";

import { Feedback } from "./types";

import { validate, canChangeStatus } from "./rules";
 
type NewFeedback = Omit<

  Feedback,

  "id" | "created_at" | "updated_at" | "status" | "syncStatus"
>;
 
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

  return fb;

}
 
export const listFeedbacks = async () => (await getDB()).getAll("feedbacks");

export const getFeedback = async (id: string) => (await getDB()).get("feedbacks", id);
 
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

  return next;

}
 
export async function respond(id: string, response: string) {

  if (response.trim().length < 3) throw new Error("Réponse trop courte.");

  const fb = await getFeedback(id);

  if (!fb) throw new Error("Feedback introuvable.");

  return updateFeedback(id, {

    response,

    status: fb.type === "COMPLAINT" && fb.status === "OPEN" ? "IN_PROGRESS" : fb.status,

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

  await db.put("deleted", { id });

}
 
export const averageRating = (list: Feedback[], doctorId: string) => {

  const r = list.filter((f) => f.type === "REVIEW" && f.doctor_id === doctorId && f.rating);

  return r.length ? r.reduce((s, f) => s + (f.rating ?? 0), 0) / r.length : 0;

};
 
// Simule l'envoi au serveur (il n'y a pas de backend pour le moment)

export async function syncPending() {

  const db = await getDB();

  const all = await db.getAll("feedbacks");

  for (const f of all) {

    if (f.syncStatus === "pending") await db.put("feedbacks", { ...f, syncStatus: "synced" });

  }

  await db.clear("deleted");

}
 
// Données de démo au premier lancement

export async function seedIfEmpty() {

  const db = await getDB();

  if ((await db.count("feedbacks")) > 0) return;

  const now = new Date().toISOString();

  const base = { created_at: now, updated_at: now, syncStatus: "synced" as const };

  await db.put("feedbacks", {

    ...base, id: "demo1", user_id: "p2", doctor_id: "d1", appointment_id: "r4",

    type: "REVIEW", rating: 5, content: "Très bon médecin, à l'écoute et ponctuel.",

    status: "OPEN",

  });

  await db.put("feedbacks", {

    ...base, id: "demo2", user_id: "p1", doctor_id: "d2", appointment_id: "r2",

    type: "COMPLAINT", subject: "Attente trop longue",

    content: "J'ai attendu plus d'une heure malgré mon rendez-vous.",

    status: "OPEN",

  });

}
