import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import Prescription from "@/models/Prescription";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/prescriptions/[id] - Consulter une ordonnance spécifique. */
export async function GET(req: Request, context: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail(400, "Identifiant invalide.");
  }

  try {
    await connectDB();
    const p: any = await Prescription.findById(id)
      .populate("patientId", "name email phone birthDate")
      .populate("doctorId", "name specialty")
      .populate("appointmentId", "date time specialty reason notes status price")
      .populate("items.medicationId", "name genericName form dosage category manufacturer requiresPrescription")
      .lean();

    if (!p) {
      return fail(404, "Ordonnance introuvable.");
    }

    // Sécurité : seul le médecin prescripteur ou le patient concerné peut consulter
    if (user.role === "DOCTOR" && String(p.doctorId._id) !== user.id) {
      return fail(403, "Accès refusé à cette ordonnance.");
    }
    if (user.role === "PATIENT" && String(p.patientId._id) !== user.id) {
      return fail(403, "Accès refusé à cette ordonnance.");
    }

    return json({
      id: String(p._id),
      appointmentId: String(p.appointmentId?._id || p.appointmentId),
      appointment: p.appointmentId,
      patientId: String(p.patientId?._id || p.patientId),
      patient: p.patientId,
      doctorId: String(p.doctorId?._id || p.doctorId),
      doctor: p.doctorId,
      items: (p.items || []).map((item: any) => ({
        medicationId: item.medicationId ? String(item.medicationId._id || item.medicationId) : null,
        medicationName: item.medicationId?.name || "Médicament",
        medicationGeneric: item.medicationId?.genericName || "",
        form: item.medicationId?.form || "",
        dosage: item.dosage || item.medicationId?.dosage || "",
        frequency: item.frequency || "",
        durationDays: item.durationDays || null,
        instructions: item.instructions || "",
        category: item.medicationId?.category || "",
        manufacturer: item.medicationId?.manufacturer || "",
      })),
      issuedAt: p.issuedAt ? new Date(p.issuedAt).toISOString() : new Date(p.createdAt).toISOString(),
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : null,
      status: p.status || "ACTIVE",
    });
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/prescriptions/[id] - Annuler une ordonnance (médecin uniquement). */
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail(400, "Identifiant invalide.");
  }

  try {
    await connectDB();
    const p = await Prescription.findById(id);
    if (!p) {
      return fail(404, "Ordonnance introuvable.");
    }

    if (String(p.doctorId) !== user.id) {
      return fail(403, "Vous ne pouvez annuler que vos propres ordonnances.");
    }

    await Prescription.findByIdAndUpdate(id, { status: "CANCELLED" });
    return json({ success: true, message: "Ordonnance annulée." });
  } catch (e) {
    return serverError(e);
  }
}
