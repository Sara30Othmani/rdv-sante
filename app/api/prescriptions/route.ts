import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import Prescription from "@/models/Prescription";
import Appointment from "@/models/Appointment";
import Medication from "@/models/Medication";
import UserModel from "@/models/User";

/**
 * GET /api/prescriptions
 * Liste des ordonnances pour le médecin connecté ou le patient connecté.
 */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get("appointmentId");
  const patientId = searchParams.get("patientId");

  try {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (user.role === "DOCTOR") {
      query.doctorId = user.id;
      if (appointmentId && Types.ObjectId.isValid(appointmentId)) {
        query.appointmentId = appointmentId;
      }
      if (patientId && Types.ObjectId.isValid(patientId)) {
        query.patientId = patientId;
      }
    } else {
      // Pour les patients : uniquement leurs propres ordonnances
      query.patientId = user.id;
      if (appointmentId && Types.ObjectId.isValid(appointmentId)) {
        query.appointmentId = appointmentId;
      }
    }

    const prescriptions = await Prescription.find(query)
      .populate("patientId", "name email phone")
      .populate("doctorId", "name")
      .populate("appointmentId", "date time specialty reason notes status")
      .populate("items.medicationId", "name genericName form dosage category manufacturer")
      .sort({ issuedAt: -1, createdAt: -1 })
      .lean();

    const formatted = prescriptions.map((p: any) => ({
      id: String(p._id),
      appointmentId: p.appointmentId ? String(p.appointmentId._id || p.appointmentId) : null,
      appointment: p.appointmentId && typeof p.appointmentId === "object" ? {
        id: String(p.appointmentId._id),
        date: p.appointmentId.date,
        time: p.appointmentId.time,
        specialty: p.appointmentId.specialty,
        reason: p.appointmentId.reason,
        notes: p.appointmentId.notes,
      } : null,
      patientId: p.patientId ? String(p.patientId._id || p.patientId) : null,
      patient: p.patientId && typeof p.patientId === "object" ? {
        id: String(p.patientId._id),
        name: p.patientId.name,
        email: p.patientId.email,
        phone: p.patientId.phone,
      } : null,
      doctorId: p.doctorId ? String(p.doctorId._id || p.doctorId) : null,
      doctor: p.doctorId && typeof p.doctorId === "object" ? {
        id: String(p.doctorId._id),
        name: p.doctorId.name,
      } : null,
      items: (p.items || []).map((item: any) => ({
        medicationId: item.medicationId ? String(item.medicationId._id || item.medicationId) : null,
        medicationName: item.medicationId?.name || "Médicament",
        medicationGeneric: item.medicationId?.genericName || "",
        form: item.medicationId?.form || "",
        dosage: item.dosage || item.medicationId?.dosage || "",
        frequency: item.frequency || "",
        durationDays: item.durationDays || null,
        instructions: item.instructions || "",
      })),
      issuedAt: p.issuedAt ? new Date(p.issuedAt).toISOString() : new Date(p.createdAt).toISOString(),
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : null,
      status: p.status || "ACTIVE",
    }));

    return json(formatted);
  } catch (e) {
    return serverError(e);
  }
}

/**
 * POST /api/prescriptions
 * Création d'une ordonnance après consultation par le médecin.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = await req.json();
    const appointmentId = String(body.appointmentId || "").trim();

    if (!appointmentId || !Types.ObjectId.isValid(appointmentId)) {
      return fail(400, "Un rendez-vous de consultation valide est requis pour établir une ordonnance.");
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return fail(400, "L'ordonnance doit contenir au moins un médicament.");
    }

    await connectDB();

    // Vérifier le rendez-vous
    const appointment = await Appointment.findById(appointmentId).lean();
    if (!appointment) {
      return fail(404, "Rendez-vous introuvable.");
    }

    if (String(appointment.doctorId) !== user.id) {
      return fail(403, "Vous ne pouvez rédiger une ordonnance que pour vos propres consultations.");
    }

    // Valider chaque médicament
    const validatedItems = [];
    for (const item of items) {
      const medId = String(item.medicationId || "").trim();
      if (!medId || !Types.ObjectId.isValid(medId)) {
        return fail(400, "Identifiant de médicament invalide dans la prescription.");
      }

      const med = await Medication.findById(medId).lean();
      if (!med) {
        return fail(404, `Médicament introuvable (ID: ${medId}).`);
      }

      validatedItems.push({
        medicationId: med._id,
        dosage: String(item.dosage || med.dosage || "").trim(),
        frequency: String(item.frequency || "1 fois par jour").trim(),
        durationDays: Number(item.durationDays) || 7,
        instructions: String(item.instructions || "").trim(),
      });
    }

    // Validité : par défaut 3 mois
    let validUntilDate = body.validUntil ? new Date(body.validUntil) : null;
    if (!validUntilDate || isNaN(validUntilDate.getTime())) {
      validUntilDate = new Date();
      validUntilDate.setMonth(validUntilDate.getMonth() + 3);
    }

    // Création de l'ordonnance
    const created = await Prescription.create({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: user.id,
      items: validatedItems,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
      validUntil: validUntilDate,
      status: "ACTIVE",
    });

    // Mettre à jour l'appointment si nécessaire (ex: passer à DONE si pas encore fait)
    if (appointment.status !== "DONE") {
      await Appointment.findByIdAndUpdate(appointment._id, { status: "DONE" });
    }

    // Récupérer avec toutes les jointures pour la réponse
    const full = await Prescription.findById(created._id)
      .populate("patientId", "name email phone")
      .populate("doctorId", "name")
      .populate("appointmentId", "date time specialty reason")
      .populate("items.medicationId", "name genericName form dosage category")
      .lean();

    return json(
      {
        id: String(full!._id),
        appointmentId: String(full!.appointmentId?._id || full!.appointmentId),
        patient: full!.patientId,
        doctor: full!.doctorId,
        items: full!.items,
        issuedAt: full!.issuedAt,
        validUntil: full!.validUntil,
        status: full!.status,
      },
      201
    );
  } catch (e) {
    return serverError(e);
  }
}
