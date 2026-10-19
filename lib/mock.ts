import { Role } from "./feedbacks/types";
 
export interface User {

  id: string;

  name: string;

  role: Role;

  specialty?: string;

}
 
export const users: User[] = [

  { id: "p1", name: "Sara (Patient)", role: "PATIENT" },

  { id: "p2", name: "Mohamed (Patient)", role: "PATIENT" },

  { id: "d1", name: "Dr. Trabelsi", role: "DOCTOR", specialty: "Cardiologie" },

  { id: "d2", name: "Dr. Ben Salah", role: "DOCTOR", specialty: "Dermatologie" },

  { id: "a1", name: "Admin", role: "ADMIN" },

];
 
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
 
export const userName = (id: string) =>

  users.find((u) => u.id === id)?.name ?? id;
 