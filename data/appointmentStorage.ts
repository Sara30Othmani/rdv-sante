import { initialAppointments, type Appointment } from "./mockData";

// "-v2" : le modèle a changé (ajout de patientId). Une nouvelle clé évite de
// relire d'anciennes données incompatibles écrites par la version précédente.
export const APPOINTMENTS_STORAGE_KEY = "rdv-sante-appointments-v2";
export const APPOINTMENTS_EVENT = "appointments-change";

const isBrowser = () => typeof window !== "undefined";

/** Valeur brute (JSON) enregistrée ; null si rien n'est enregistré. */
export function readRawAppointments(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseAppointments(raw: string | null): Appointment[] {
  if (raw === null) return initialAppointments;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as Appointment[]) : initialAppointments;
  } catch {
    return initialAppointments;
  }
}

export function getAppointments(): Appointment[] {
  return parseAppointments(readRawAppointments());
}

export function saveAppointments(appointments: Appointment[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
  // Prévient les composants de la même page (l'évènement natif "storage"
  // ne se déclenche que dans les AUTRES onglets).
  window.dispatchEvent(new Event(APPOINTMENTS_EVENT));
}

export function getAppointmentById(id: number): Appointment | undefined {
  return getAppointments().find((a) => a.id === id);
}

/** Prochain identifiant libre (plus simple et plus lisible qu'un Date.now()). */
export function nextAppointmentId(): number {
  return getAppointments().reduce((max, a) => Math.max(max, a.id), 0) + 1;
}

export function addAppointment(appointment: Appointment): void {
  saveAppointments([...getAppointments(), appointment]);
}

/** Modifie uniquement les champs fournis. */
export function patchAppointment(
  id: number,
  changes: Partial<Omit<Appointment, "id">>
): void {
  saveAppointments(
    getAppointments().map((a) => (a.id === id ? { ...a, ...changes } : a))
  );
}

export function deleteAppointment(id: number): void {
  saveAppointments(getAppointments().filter((a) => a.id !== id));
}
