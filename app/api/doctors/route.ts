import DoctorProfile from "@/models/DoctorProfile";
import UserModel from "@/models/User";
import Appointment from "@/models/Appointment";
import FeedbackModel from "@/models/Feedback";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { json, serverError } from "@/lib/http";
import { ACTIVE_CODES, type Doctor } from "@/lib/appointments";
import { getScheduleOf } from "@/lib/schedule";

const initialsOf = (name: string) =>
  name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Médecins vérifiés, avec note moyenne et réservations en cours (calculées à la volée). */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const profiles = await DoctorProfile.find({ verified: true }).lean();
    const ids = profiles.map((p) => p.userId);

    const [users, reservations, ratings] = await Promise.all([
      UserModel.find({ _id: { $in: ids }, isActive: true }).select("name").lean(),
      Appointment.aggregate<{ _id: unknown; n: number }>([
        { $match: { doctorId: { $in: ids }, status: { $in: ACTIVE_CODES } } },
        { $group: { _id: "$doctorId", n: { $sum: 1 } } },
      ]),
      FeedbackModel.aggregate<{ _id: unknown; avg: number; n: number }>([
        { $match: { doctorId: { $in: ids }, type: "REVIEW" } },
        { $group: { _id: "$doctorId", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
      ]),
    ]);

    const nameOf = new Map(users.map((u) => [String(u._id), u.name]));
    const reservedOf = new Map(reservations.map((r) => [String(r._id), r.n]));
    const ratingOf = new Map(ratings.map((r) => [String(r._id), r]));

    const doctors: Doctor[] = profiles
      .filter((p) => nameOf.has(String(p.userId)))
      .map((p) => {
        const id = String(p.userId);
        const name = nameOf.get(id)!;
        const rating = ratingOf.get(id);
        return {
          id,
          name,
          specialty: p.specialty,
          address: p.address ?? "",
          city: p.city,
          price: p.price ?? 0,
          schedule: getScheduleOf(p),
          initials: initialsOf(name),
          reservations: reservedOf.get(id) ?? 0,
          ratingAvg: rating ? rating.avg : null,
          ratingCount: rating ? rating.n : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return json(doctors);

  } catch (e) {
    return serverError(e);
  }
}
