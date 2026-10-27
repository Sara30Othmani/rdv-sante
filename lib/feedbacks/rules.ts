import type { Feedback, FeedbackStatus, Role } from "./types";

// Ces règles sont appliquées dans le navigateur (pour l'affichage) ET sur le
// serveur (routes /api/feedbacks) : c'est le serveur qui fait foi.

export const NEXT_STATUS: Record<FeedbackStatus, FeedbackStatus | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "CLOSED",
  CLOSED: null,
};

export const canChangeStatus = (from: FeedbackStatus, to: FeedbackStatus) =>
  NEXT_STATUS[from] === to;

export function validate(f: Partial<Feedback>): string[] {
  const errors: string[] = [];
  if (!f.content || f.content.trim().length < 10)
    errors.push("Le contenu doit contenir au moins 10 caractères.");
  if (f.type === "REVIEW" && (!f.rating || f.rating < 1 || f.rating > 5))
    errors.push("La note doit être comprise entre 1 et 5.");
  if (f.type === "COMPLAINT" && !f.subject?.trim())
    errors.push("Le sujet est obligatoire pour une réclamation.");
  if (!f.appointment_id) errors.push("Choisis un rendez-vous.");
  return errors;
}

/** Patient : ses feedbacks. Médecin : ceux qui lui sont adressés. */
export function canView(f: Feedback, userId: string, role: Role) {
  return role === "DOCTOR" ? f.doctor_id === userId : f.user_id === userId;
}

/** Seul l'auteur modifie, tant que l'avis existe ou que la réclamation est ouverte. */
export function canEdit(f: Feedback, userId: string, role: Role) {
  if (role !== "PATIENT" || f.user_id !== userId) return false;
  return f.type === "REVIEW" || f.status === "OPEN";
}

/**
 * Seul l'auteur supprime : un médecin ne peut pas faire disparaître un avis
 * négatif, il peut seulement y répondre.
 */
export const canDelete = canEdit;

export function canRespond(f: Feedback, userId: string, role: Role) {
  return role === "DOCTOR" && f.doctor_id === userId;
}

export function canManageStatus(f: Feedback, userId: string, role: Role) {
  return f.type === "COMPLAINT" && canRespond(f, userId, role);
}
