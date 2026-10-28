import { Types } from "mongoose";
import Appointment from "@/models/Appointment";
import DoctorProfile from "@/models/DoctorProfile";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, isDuplicateKey, json, serverError } from "@/lib/http";
import { toAppointmentDTO } from "@/lib/dto";
import {
  STATUS_CODE,
  isISODate,
  isTime,
  type AppointmentStatus,
  type AppointmentStatusCode,
} from "@/lib/appointments";

type Body = {
  date?: string;
  time?: string;
  reason?: string;
  status?: AppointmentStatus;
  notes?: string;
};

// Transitions autorisées pour le médecin
const DOCTOR_TRANSITIONS: Record<AppointmentStatusCode, AppointmentStatusCode[]> = {
  PENDING: ["ACCEPTED", "REFUSED"],
  ACCEPTED: ["DONE"],
  REFUSED: [],
  CANCELLED: [],
  DONE: [],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail(404, "Rendez-vous introuvable.");

    const body = (await req.json()) as Body;
    await connectDB();

    const appt = await Appointment.findById(id);
    // 404 aussi quand le rendez-vous appartient à quelqu'un d'autre
    const mine =
      appt && String(user.role === "DOCTOR" ? appt.doctorId : appt.patientId) === user.id;
    if (!appt || !mine) return fail(404, "Rendez-vous introuvable.");

    const requested = body.status ? STATUS_CODE[body.status] : undefined;
    if (body.status && !requested) return fail(400, "Statut invalide.");

    if (user.role === "PATIENT") {
      if (!["PENDING", "ACCEPTED"].includes(appt.status))
        return fail(409, "Ce rendez-vous est clôturé.");
      if (body.notes !== undefined) return fail(403, "Les notes sont réservées au médecin.");

      if (requested) {
        if (requested !== "CANCELLED")
          return fail(403, "Un patient peut seulement annuler son rendez-vous.");
        appt.status = "CANCELLED";
      } else {
        const date = body.date ?? appt.date;
        const time = body.time ?? appt.time;
        const reason = (body.reason ?? appt.reason).trim();

        if (!isISODate(date)) return fail(400, "Date invalide.");
        if (!isTime(time)) return fail(400, "Heure invalide.");
        if (reason.length < 5 || reason.length > 500)
          return fail(400, "Le motif doit contenir entre 5 et 500 caractères.");

        const moved = date !== appt.date || time !== appt.time;
        if (moved) {
          const profile = await DoctorProfile.findOne({ userId: appt.doctorId }).lean();
          if (!profile?.availableSlots.includes(time))
            return fail(400, "Ce créneau n'est pas proposé par ce médecin.");
          // Le médecin doit confirmer de nouveau le nouvel horaire
          if (appt.status === "ACCEPTED") appt.status = "PENDING";
        }
        appt.date = date;
        appt.time = time;
        appt.reason = reason;
      }
    } else {
      if (body.date !== undefined || body.time !== undefined || body.reason !== undefined)
        return fail(403, "Le médecin ne modifie pas l'horaire ni le motif.");

      if (requested) {
        if (!DOCTOR_TRANSITIONS[appt.status].includes(requested))
          return fail(409, "Changement de statut impossible depuis l'état actuel.");
        appt.status = requested;
      }
      if (body.notes !== undefined) {
        if (!["ACCEPTED", "DONE"].includes(appt.status))
          return fail(409, "Les notes sont possibles après acceptation du rendez-vous.");
        if (body.notes.length > 2000) return fail(400, "Note trop longue (2000 caractères).");
        appt.notes = body.notes;
      }
    }

    try {
      await appt.save();
    } catch (e) {
      if (isDuplicateKey(e)) return fail(409, "Ce créneau est déjà réservé.");
      throw e;
    }
    return json(toAppointmentDTO(appt.toObject()));
  } catch (e) {
    return serverError(e);
  }
}
