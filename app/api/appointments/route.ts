import { Types } from "mongoose";
import Appointment from "@/models/Appointment";
import DoctorProfile from "@/models/DoctorProfile";
import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, isDuplicateKey, json, serverError } from "@/lib/http";
import { toAppointmentDTO } from "@/lib/dto";
import { isISODate, isTime, type NewAppointment } from "@/lib/appointments";
import { getScheduleOf, slotsForDate } from "@/lib/schedule";

/** Patient : ses rendez-vous. Médecin : ceux pris chez lui. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    await connectDB();
    const filter =
      user.role === "DOCTOR" ? { doctorId: user.id } : { patientId: user.id };
    const list = await Appointment.find(filter).sort({ date: -1, time: -1 }).lean();
    return json(list.map(toAppointmentDTO));
  } catch (e) {
    return serverError(e);
  }
}

/** Création : réservée au patient. */
export async function POST(req: Request) {
  const auth = await requireUser(req, ["PATIENT"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = (await req.json()) as Partial<NewAppointment>;
    const reason = body.reason?.trim() ?? "";

    if (!body.doctorId || !Types.ObjectId.isValid(body.doctorId))
      return fail(400, "Médecin invalide.");
    if (!isISODate(body.date)) return fail(400, "Date invalide.");
    if (!isTime(body.time)) return fail(400, "Heure invalide.");
    if (reason.length < 5 || reason.length > 500)
      return fail(400, "Le motif doit contenir entre 5 et 500 caractères.");

    // Tolérance d'un jour pour les écarts de fuseau horaire
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (body.date < yesterday) return fail(400, "Cette date est passée.");

    await connectDB();
    const [profile, doctor] = await Promise.all([
      DoctorProfile.findOne({ userId: body.doctorId, verified: true }).lean(),
      UserModel.findOne({ _id: body.doctorId, role: "DOCTOR", isActive: true })
        .select("name")
        .lean(),
    ]);
    if (!profile || !doctor) return fail(404, "Médecin introuvable.");
    if (!slotsForDate(getScheduleOf(profile), body.date).includes(body.time))
      return fail(400, "Ce créneau n'est pas proposé par ce médecin ce jour-là.");

    try {
      const created = await Appointment.create({
        patientId: user.id,
        patientName: user.name,
        doctorId: body.doctorId,
        doctorName: doctor.name,
        specialty: profile.specialty,
        date: body.date,
        time: body.time,
        reason,
        price: profile.price,
      });
      return json(toAppointmentDTO(created.toObject()), 201);
    } catch (e) {
      if (isDuplicateKey(e)) return fail(409, "Ce créneau vient d'être réservé. Choisissez-en un autre.");
      throw e;
    }
  } catch (e) {
    return serverError(e);
  }
}
