// Types et constantes des rendez-vous, partagés par le navigateur et le serveur.

export type AppointmentStatus =
  | "En attente"
  | "Accepté"
  | "Refusé"
  | "Annulé"
  | "Terminé";

/** Codes stockés en base ; les libellés français ne servent qu'à l'affichage. */
export type AppointmentStatusCode =
  | "PENDING"
  | "ACCEPTED"
  | "REFUSED"
  | "CANCELLED"
  | "DONE";

export const STATUS_LABEL: Record<AppointmentStatusCode, AppointmentStatus> = {
  PENDING: "En attente",
  ACCEPTED: "Accepté",
  REFUSED: "Refusé",
  CANCELLED: "Annulé",
  DONE: "Terminé",
};

export const STATUS_CODE: Record<AppointmentStatus, AppointmentStatusCode> = {
  "En attente": "PENDING",
  Accepté: "ACCEPTED",
  Refusé: "REFUSED",
  Annulé: "CANCELLED",
  Terminé: "DONE",
};

/** Codes qui occupent un créneau chez le médecin. */
export const ACTIVE_CODES: AppointmentStatusCode[] = ["PENDING", "ACCEPTED"];

export const APPOINTMENT_STATUSES = Object.values(STATUS_LABEL);

/** Statuts après lesquels le rendez-vous ne peut plus être modifié. */
export const CLOSED_STATUSES: AppointmentStatus[] = ["Refusé", "Annulé", "Terminé"];

export const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  "En attente": "status-pending",
  Accepté: "status-accepted",
  Refusé: "status-rejected",
  Annulé: "status-cancelled",
  Terminé: "status-completed",
};

import type { WeeklySchedule } from "./schedule";

/** Rendez-vous tel que l'API le renvoie (ids = texte). */
export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string; // id de l'utilisateur médecin
  doctorName: string;
  specialty: string;
  date: string; // AAAA-MM-JJ
  time: string; // HH:MM
  reason: string;
  status: AppointmentStatus;
  notes: string;
  cancelReason?: string; // motif d'annulation saisi par le patient
};

export type NewAppointment = {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
};

/** Médecin tel que l'API le renvoie (liste de la page d'accueil patient). */
export type Doctor = {
  id: string; // id de l'utilisateur
  name: string;
  specialty: string;
  address: string;
  city: string;
  price: number;
  schedule: WeeklySchedule; // jours et heures de travail
  initials: string;
  reservations: number; // rendez-vous en cours
  ratingAvg: number | null; // null = aucun avis
  ratingCount: number;
};

export const isISODate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export const isTime = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
