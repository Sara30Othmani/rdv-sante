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
    const filter: Record<string, unknown> = { isActive: true };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { genericName: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ];
    }
    if (category && category !== "ALL") {
      filter.category = category;
    }

    const list = await Medication.find(filter).sort({ name: 1 }).limit(100).lean();
    return json(
      list.map((m) => ({
        id: String(m._id),
        name: m.name,
        genericName: m.genericName,
        form: m.form,
        dosage: m.dosage,
        category: m.category,
        manufacturer: m.manufacturer,
        requiresPrescription: m.requiresPrescription,
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
      return fail(400, "Le nom de l'article est requis (minimum 2 caractères).");
    }

    await connectDB();

    // Vérifier si un article avec le même nom existe déjà
    const existing = await Medication.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    }).lean();

    if (existing) {
      return json(
        {
          id: String(existing._id),
          name: existing.name,
          genericName: existing.genericName,
          form: existing.form,
          dosage: existing.dosage,
          category: existing.category,
          manufacturer: existing.manufacturer,
        },
        200
      );
    }

    const created = await Medication.create({
      name,
      genericName: body.genericName?.trim() || undefined,
      form: body.form || "OTHER",
      dosage: body.dosage?.trim() || undefined,
      category: body.category?.trim() || "Divers",
      manufacturer: body.manufacturer?.trim() || undefined,
      requiresPrescription: Boolean(body.requiresPrescription),
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
      },
      201
    );
  } catch (e) {
    return serverError(e);
  }
}
