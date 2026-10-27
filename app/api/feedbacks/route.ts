import FeedbackModel from "@/models/Feedback";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { json, serverError } from "@/lib/http";
import { toFeedbackDTO } from "@/lib/dto";

/** Patient : ses feedbacks. Médecin : ceux qui lui sont adressés. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    await connectDB();
    const filter =
      user.role === "DOCTOR" ? { doctorId: user.id } : { userId: user.id };
    const list = await FeedbackModel.find(filter).sort({ createdAt: -1 }).lean();
    return json(list.map(toFeedbackDTO));
  } catch (e) {
    return serverError(e);
  }
}
