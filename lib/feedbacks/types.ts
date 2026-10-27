export type FeedbackType = "REVIEW" | "COMPLAINT";
export type FeedbackStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type Role = "PATIENT" | "DOCTOR";

/** Feedback tel qu'il circule entre le navigateur (IndexedDB) et l'API. */
export interface Feedback {
  id: string; // UUID créé côté client (= clientId en base)
  user_id: string; // auteur (patient)
  user_name: string;
  doctor_id: string; // médecin concerné
  doctor_name: string;
  appointment_id: string;
  type: FeedbackType;
  rating?: number;
  subject?: string;
  content: string;
  response?: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  syncStatus: "synced" | "pending";
}
