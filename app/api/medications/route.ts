import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import Medication from "@/models/Medication";

/** Liste des médicaments / consommables du catalogue partagé. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();

  try {
    await connectDB();
    const filter: Record<string, unknown> = { isActive: { $ne: false } };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { genericName: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { manufacturer: { $regex: q, $options: "i" } },
      ];
    }
    if (category && category !== "ALL") {
      filter.category = category;
    }

    const list = await Medication.find(filter).sort({ name: 1 }).limit(200).lean();
    return json(
      list.map((m) => ({
        id: String(m._id),
        name: m.name,
        genericName: m.genericName,
        form: m.form || "TABLET",
        dosage: m.dosage,
        category: m.category || "Général",
        manufacturer: m.manufacturer,
        requiresPrescription: Boolean(m.requiresPrescription),
        contraindications: m.contraindications || [],
        sideEffects: m.sideEffects || [],
        createdAt: m.createdAt,
      }))
    );
  } catch (e) {
    return serverError(e);
  }
}

/** Ajout d'un nouveau médicament ou matériel au catalogue (réservé aux médecins). */
export async function POST(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

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

    const created = await Medication.create({
      name,
      genericName: body.genericName?.trim() || undefined,
      form: body.form || "TABLET",
      dosage: body.dosage?.trim() || undefined,
      category: body.category?.trim() || "Général",
      manufacturer: body.manufacturer?.trim() || undefined,
      requiresPrescription: Boolean(body.requiresPrescription),
      contraindications,
      sideEffects,
      isActive: true,
      createdBy: user.id,
    });

    return json(
      {
        id: String(created._id),
        name: created.name,
        genericName: created.genericName,
        form: created.form,
        dosage: created.dosage,
        category: created.category,
        manufacturer: created.manufacturer,
        requiresPrescription: created.requiresPrescription,
        contraindications: created.contraindications,
        sideEffects: created.sideEffects,
      },
      201
    );
  } catch (e) {
    return serverError(e);
  }
}
