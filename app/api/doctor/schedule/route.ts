import DoctorProfile from "@/models/DoctorProfile";
import Appointment from "@/models/Appointment";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import { ACTIVE_CODES } from "@/lib/appointments";
import { getScheduleOf, slotsForDate, validateSchedule } from "@/lib/schedule";

/** Horaires de travail du médecin connecté. */
export async function GET(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const profile = await DoctorProfile.findOne({ userId: auth.user.id }).lean();
    if (!profile) return fail(404, "Profil médecin introuvable.");
    return json({ schedule: getScheduleOf(profile) });
  } catch (e) {
    return serverError(e);
  }
}

/** Enregistre les horaires. Les rendez-vous déjà pris sont conservés ; on indique combien sortent du nouvel horaire. */
export async function PUT(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { schedule?: unknown };
    const result = validateSchedule(body.schedule);
    if ("error" in result) return fail(400, result.error);

    await connectDB();
    const profile = await DoctorProfile.findOne({ userId: auth.user.id });
    if (!profile) return fail(404, "Profil médecin introuvable.");

    profile.set("schedule", result.schedule); // set() : accepte un objet simple (types Mongoose)
    await profile.save();

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = await Appointment.find({
      doctorId: auth.user.id,
      status: { $in: ACTIVE_CODES },
      date: { $gte: today },
    })
      .select("date time")
      .lean();
    const outsideCount = upcoming.filter(
      (a) => !slotsForDate(result.schedule, a.date).includes(a.time)
    ).length;

    return json({ schedule: getScheduleOf(profile), outsideCount });
  } catch (e) {
    return serverError(e);
  }
}
