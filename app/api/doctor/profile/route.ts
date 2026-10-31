
import { NextRequest } from "next/server";
import DoctorProfile from "@/models/DoctorProfile";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";

/** Récupérer le profil du médecin connecté */
export async function GET(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();

    const profile = await DoctorProfile.findOne({
      userId: auth.user.id,
    }).lean();

    if (!profile) {
      return fail(404, "Profil médecin introuvable.");
    }

    return json({ profile });
  } catch (e) {
    return serverError(e);
  }
}

/** Modifier le profil médecin existant */
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    const specialty = String(body.specialty ?? "").trim();
    const address = String(body.address ?? "").trim();
    const city = String(body.city ?? "").trim();
    const licenseNumber = String(body.licenseNumber ?? "").trim();
    const price = Number(body.price);

    // Validation des données
    if (!specialty || !address || !city || !licenseNumber) {
      return fail(400, "Veuillez remplir tous les champs obligatoires.");
    }

    if (!Number.isFinite(price) || price < 0) {
      return fail(400, "Le prix de consultation est invalide.");
    }

    await connectDB();

    const profile = await DoctorProfile.findOne({
      userId: auth.user.id,
    });

    if (!profile) {
      return fail(404, "Profil médecin introuvable.");
    }

    // Mise à jour du document existant
    profile.set({
      specialty,
      address,
      city,
      price,
      licenseNumber,
    });

    await profile.save();

    return json({
      message: "Profil mis à jour avec succès.",
      profile,
    });
  } catch (e) {
    return serverError(e);
  }
}
