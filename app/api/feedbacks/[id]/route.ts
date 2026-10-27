import { Types } from "mongoose";
import FeedbackModel from "@/models/Feedback";
import Appointment from "@/models/Appointment";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, isDuplicateKey, json, serverError } from "@/lib/http";
import { toFeedbackDTO } from "@/lib/dto";
import type { Feedback } from "@/lib/feedbacks/types";
import {
  canChangeStatus,
  canDelete,
  canEdit,
  canRespond,
  canView,
  validate,
} from "@/lib/feedbacks/rules";

type Ctx = { params: Promise<{ id: string }> };

// L'identifiant de l'URL est le clientId (UUID créé dans le navigateur).

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { id } = await params;
    await connectDB();
    const doc = await FeedbackModel.findOne({ clientId: id }).lean();
    if (!doc) return fail(404, "Feedback introuvable.");
    const dto = toFeedbackDTO(doc);
    // 404 (et non 403) pour ne pas révéler l'existence du feedback d'un autre
    if (!canView(dto, user.id, user.role)) return fail(404, "Feedback introuvable.");
    return json(dto);
  } catch (e) {
    return serverError(e);
  }
}

/**
 * Création OU mise à jour (idempotent) : c'est ce qu'appelle la synchronisation
 * hors-ligne. Le serveur ne fait pas confiance au corps : ce qui est accepté
 * dépend du profil et de l'état du feedback.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<Feedback>;
    await connectDB();

    const existing = await FeedbackModel.findOne({ clientId: id });

    // ---------- création (patient) ----------
    if (!existing) {
      if (user.role !== "PATIENT")
        return fail(403, "Seul un patient peut créer un feedback.");

      const errors = validate(body);
      if (errors.length) return fail(400, errors.join("\n"));

      if (!Types.ObjectId.isValid(body.appointment_id ?? ""))
        return fail(400, "Rendez-vous invalide.");
      const appt = await Appointment.findById(body.appointment_id).lean();
      if (!appt || String(appt.patientId) !== user.id)
        return fail(404, "Rendez-vous introuvable.");
      if (body.type === "REVIEW" && appt.status !== "DONE")
        return fail(400, "Un avis n'est possible qu'après une consultation terminée.");

      try {
        const created = await FeedbackModel.create({
          clientId: id,
          userId: user.id,
          userName: user.name,
          doctorId: appt.doctorId, // déduit du rendez-vous, jamais du corps
          doctorName: appt.doctorName,
          appointmentId: appt._id,
          type: body.type,
          rating: body.type === "REVIEW" ? body.rating : undefined,
          subject: body.type === "COMPLAINT" ? body.subject?.trim() : undefined,
          content: body.content!.trim(),
        });
        return json(toFeedbackDTO(created.toObject()), 201);
      } catch (e) {
        if (isDuplicateKey(e))
          return fail(409, "Un avis existe déjà pour ce rendez-vous.");
        throw e;
      }
    }

    // ---------- mise à jour ----------
    const dto = toFeedbackDTO(existing.toObject());
    if (!canView(dto, user.id, user.role)) return fail(404, "Feedback introuvable.");

    if (canEdit(dto, user.id, user.role)) {
      // L'auteur modifie son contenu (type, rendez-vous et statut sont figés)
      const next = {
        ...dto,
        content: body.content ?? dto.content,
        rating: body.rating ?? dto.rating,
        subject: body.subject ?? dto.subject,
      };
      const errors = validate(next);
      if (errors.length) return fail(400, errors.join("\n"));

      existing.content = next.content.trim();
      if (dto.type === "REVIEW") existing.rating = next.rating;
      else existing.subject = next.subject?.trim();
    } else if (canRespond(dto, user.id, user.role)) {
      // Le médecin répond et fait avancer le statut d'une réclamation
      if (body.response !== undefined) {
        if (body.response.trim().length < 3) return fail(400, "Réponse trop courte.");
        existing.response = body.response.trim();
      }
      if (body.status && body.status !== existing.status) {
        if (dto.type !== "COMPLAINT" || !canChangeStatus(existing.status, body.status))
          return fail(409, "Transition interdite.");
        existing.status = body.status;
      }
    } else {
      return fail(403, "Modification non autorisée.");
    }

    await existing.save();
    return json(toFeedbackDTO(existing.toObject()));
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { id } = await params;
    await connectDB();
    const existing = await FeedbackModel.findOne({ clientId: id });
    if (!existing) return fail(404, "Feedback introuvable.");

    const dto = toFeedbackDTO(existing.toObject());
    if (!canView(dto, user.id, user.role)) return fail(404, "Feedback introuvable.");
    if (!canDelete(dto, user.id, user.role)) return fail(403, "Suppression non autorisée.");

    await existing.deleteOne();
    return new Response(null, { status: 204 });
  } catch (e) {
    return serverError(e);
  }
}
