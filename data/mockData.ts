// ---------------------------------------------------------------------------
// Données de démonstration : SOURCE UNIQUE pour toute l'application
// (rendez-vous ET feedbacks). À remplacer par l'API quand elle existera.
// ---------------------------------------------------------------------------

export type Patient = {
  id: string; // "p1", "p2"…
  name: string;
};

export type Doctor = {
  id: number; // 1, 2, 3… (l'identifiant utilisateur correspondant est "d1", "d2"…)
  name: string;
  specialty: string;
  address: string;
  city: string;
  price: number;
  availableSlots: string[];
  initials: string;
  reservations: number;
};

export type AppointmentStatus =
  | "En attente"
  | "Accepté"
  | "Refusé"
  | "Annulé"
  | "Terminé";

export type Appointment = {
  id: number;
  patientId: string;
  patientName: string;
  doctorId: number;
  doctorName: string;
  specialty: string;
  date: string; // AAAA-MM-JJ
  time: string; // HH:MM
  reason: string;
  status: AppointmentStatus;
  notes: string;
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "En attente",
  "Accepté",
  "Refusé",
  "Annulé",
  "Terminé",
];

/** Statuts après lesquels le rendez-vous ne peut plus être modifié. */
export const CLOSED_STATUSES: AppointmentStatus[] = [
  "Refusé",
  "Annulé",
  "Terminé",
];

export const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  "En attente": "status-pending",
  Accepté: "status-accepted",
  Refusé: "status-rejected",
  Annulé: "status-cancelled",
  Terminé: "status-completed",
};

export const patients: Patient[] = [
  { id: "p1", name: "Sarra Ben Ali" },
  { id: "p2", name: "Ahmed Mansour" },
];

export const doctors: Doctor[] = [
  {
    id: 1,
    name: "Dr. Amel Ben Salem",
    specialty: "Cardiologie",
    address: "Tunis",
    city: "Tunis",
    price: 80,
    availableSlots: ["09:00", "10:00", "11:00", "14:00"],
    initials: "AB",
    reservations: 12,
  },
  {
    id: 2,
    name: "Dr. Yassine Trabelsi",
    specialty: "Dermatologie",
    address: "Ariana",
    city: "Ariana",
    price: 60,
    availableSlots: ["09:30", "11:30", "15:00"],
    initials: "YT",
    reservations: 8,
  },
  {
    id: 3,
    name: "Dr. Mariem Gharbi",
    specialty: "Médecine générale",
    address: "La Marsa",
    city: "La Marsa",
    price: 50,
    availableSlots: ["08:30", "10:30", "13:30"],
    initials: "MG",
    reservations: 5,
  },
];

export const initialAppointments: Appointment[] = [
  {
    id: 1,
    patientId: "p1",
    patientName: "Sarra Ben Ali",
    doctorId: 1,
    doctorName: "Dr. Amel Ben Salem",
    specialty: "Cardiologie",
    date: "2026-11-05",
    time: "10:00",
    reason: "Consultation de suivi",
    status: "En attente",
    notes: "",
  },
  {
    id: 2,
    patientId: "p2",
    patientName: "Ahmed Mansour",
    doctorId: 2,
    doctorName: "Dr. Yassine Trabelsi",
    specialty: "Dermatologie",
    date: "2026-11-10",
    time: "11:30",
    reason: "Consultation dermatologique",
    status: "Accepté",
    notes: "",
  },
  // Consultations terminées : nécessaires pour laisser un avis / une réclamation
  {
    id: 3,
    patientId: "p1",
    patientName: "Sarra Ben Ali",
    doctorId: 2,
    doctorName: "Dr. Yassine Trabelsi",
    specialty: "Dermatologie",
    date: "2026-09-12",
    time: "09:30",
    reason: "Contrôle de la peau",
    status: "Terminé",
    notes: "Aucune anomalie détectée.",
  },
  {
    id: 4,
    patientId: "p2",
    patientName: "Ahmed Mansour",
    doctorId: 1,
    doctorName: "Dr. Amel Ben Salem",
    specialty: "Cardiologie",
    date: "2026-09-20",
    time: "14:00",
    reason: "Bilan cardiaque",
    status: "Terminé",
    notes: "",
  },
  {
    id: 5,
    patientId: "p1",
    patientName: "Sarra Ben Ali",
    doctorId: 1,
    doctorName: "Dr. Amel Ben Salem",
    specialty: "Cardiologie",
    date: "2026-08-03",
    time: "11:00",
    reason: "Première consultation",
    status: "Terminé",
    notes: "",
  },
];
