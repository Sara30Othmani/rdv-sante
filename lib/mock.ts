import { doctors, patients } from "@/data/mockData";
import { getAppointments } from "@/data/appointmentStorage";
import type { Role } from "./feedbacks/types";

export interface User {
  id: string;
  name: string;
  role: Role;
  specialty?: string;
}

/** Identifiant « utilisateur » d'un médecin : 1 → "d1". */
export const doctorUserId = (doctorId: number) => `d${doctorId}`;

/** "d1" → 1 ; renvoie null si l'utilisateur n'est pas un médecin. */
export function doctorIdFromUserId(userId: string): number | null {
  const match = /^d(\d+)$/.exec(userId);
  return match ? Number(match[1]) : null;
}

// Les utilisateurs sont DÉRIVÉS de data/mockData.ts : plus de doublon.
export const users: User[] = [
  ...patients.map((p) => ({
    id: p.id,
    name: p.name,
    role: "PATIENT" as const,
  })),
  ...doctors.map((d) => ({
    id: doctorUserId(d.id),
    name: d.name,
    role: "DOCTOR" as const,
    specialty: d.specialty,
  })),
  { id: "a1", name: "Administrateur", role: "ADMIN" as const },
];

export const userName = (id: string) =>
  users.find((u) => u.id === id)?.name ?? id;

/** Vue « feedbacks » d'un rendez-vous (ids sous forme de texte). */
export interface FeedbackAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  done: boolean; // consultation terminée → un avis est possible
}

export function listFeedbackAppointments(): FeedbackAppointment[] {
  return getAppointments().map((a) => ({
    id: String(a.id),
    patient_id: a.patientId,
    doctor_id: doctorUserId(a.doctorId),
    date: a.date,
    done: a.status === "Terminé",
  }));
}

export interface Appointment {

  id: string;

  patient_id: string;

  doctor_id: string;

  date: string;

  status: "DONE" | "UPCOMING";

}
 
export const appointments: Appointment[] = [

  { id: "r1", patient_id: "p1", doctor_id: "d1", date: "2025-01-10", status: "DONE" },

  { id: "r2", patient_id: "p1", doctor_id: "d2", date: "2025-02-03", status: "DONE" },

  { id: "r3", patient_id: "p1", doctor_id: "d1", date: "2026-06-20", status: "UPCOMING" },

  { id: "r4", patient_id: "p2", doctor_id: "d1", date: "2025-03-12", status: "DONE" },

];