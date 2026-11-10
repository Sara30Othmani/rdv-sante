import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import Medication from "@/models/Medication";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/medications/[id] - Consulter les détails d'un médicament. */
export async function GET(req: Request, context: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail(400, "Identifiant invalide.");
  }

  try {
    await connectDB();
    const item = await Medication.findById(id).lean();
    if (!item) {
      return fail(404, "Médicament introuvable.");
    }

    return json({
      id: String(item._id),
      name: item.name,
      genericName: item.genericName,
      form: item.form,
      dosage: item.dosage,
      category: item.category,
      manufacturer: item.manufacturer,
      requiresPrescription: Boolean(item.requiresPrescription),
      contraindications: item.contraindications || [],
      sideEffects: item.sideEffects || [],
      isActive: item.isActive !== false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  } catch (e) {
    return serverError(e);
  }
}

/** PUT /api/medications/[id] - Modifier un médicament (médecin uniquement). */
export async function PUT(req: Request, context: RouteContext) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail(400, "Identifiant invalide.");
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name || name.length < 2) {
      return fail(400, "Le nom du médicament est requis (minimum 2 caractères).");
    }

    await connectDB();

    const contraindications = Array.isArray(body.contraindications)
      ? body.contraindications.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof body.contraindications === "string" && body.contraindications.trim()
      ? body.contraindications.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const sideEffects = Array.isArray(body.sideEffects)
      ? body.sideEffects.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof body.sideEffects === "string" && body.sideEffects.trim()
      ? body.sideEffects.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const updated = await Medication.findByIdAndUpdate(
      id,
      {
        name,
        genericName: body.genericName?.trim() || undefined,
        form: body.form || "TABLET",
        dosage: body.dosage?.trim() || undefined,
        category: body.category?.trim() || "Général",
        manufacturer: body.manufacturer?.trim() || undefined,
        requiresPrescription: Boolean(body.requiresPrescription),
        contraindications,
        sideEffects,
        updatedBy: user.id,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return fail(404, "Médicament introuvable.");
    }

    return json({
      id: String(updated._id),
      name: updated.name,
      genericName: updated.genericName,
      form: updated.form,
      dosage: updated.dosage,
      category: updated.category,
      manufacturer: updated.manufacturer,
      requiresPrescription: updated.requiresPrescription,
      contraindications: updated.contraindications,
      sideEffects: updated.sideEffects,
    });
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/medications/[id] - Supprimer un médicament (médecin uniquement). */
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail(400, "Identifiant invalide.");
  }

  try {
    await connectDB();
    const deleted = await Medication.findByIdAndDelete(id);
    if (!deleted) {
      return fail(404, "Médicament introuvable.");
    }
    return json({ success: true, message: "Médicament supprimé avec succès." });
  } catch (e) {
    return serverError(e);
  }
}
