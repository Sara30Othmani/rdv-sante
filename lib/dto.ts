// Conversion document MongoDB → objet envoyé au navigateur (côté serveur uniquement).
import type { AppointmentDoc } from "@/models/Appointment";
import type { FeedbackDoc } from "@/models/Feedback";
import { STATUS_LABEL, type Appointment } from "./appointments";
import type { Feedback } from "./feedbacks/types";

type WithId<T> = T & { _id: unknown; createdAt?: Date; updatedAt?: Date };

export function toAppointmentDTO(a: WithId<AppointmentDoc>): Appointment {
  return {
    id: String(a._id),
    patientId: String(a.patientId),
    patientName: a.patientName,
    doctorId: String(a.doctorId),
    doctorName: a.doctorName,
    specialty: a.specialty,
    date: a.date,
    time: a.time,
    reason: a.reason,
    status: STATUS_LABEL[a.status],
    notes: a.notes ?? "",
  };
}

export function toFeedbackDTO(f: WithId<FeedbackDoc>): Feedback {
  return {
    id: f.clientId,
    user_id: String(f.userId),
    user_name: f.userName,
    doctor_id: String(f.doctorId),
    doctor_name: f.doctorName,
    appointment_id: String(f.appointmentId),
    type: f.type,
    rating: f.rating ?? undefined,
    subject: f.subject ?? undefined,
    content: f.content,
    response: f.response ?? undefined,
    status: f.status,
    created_at: (f.createdAt ?? new Date()).toISOString(),
    updated_at: (f.updatedAt ?? new Date()).toISOString(),
    syncStatus: "synced",
  };
}
