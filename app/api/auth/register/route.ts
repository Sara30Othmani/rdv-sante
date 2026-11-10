
import { NextRequest } from "next/server";
import UserModel from "@/models/User";
import DoctorProfileModel from "@/models/DoctorProfile";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError, isDuplicateKey } from "@/lib/http";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { randomToken } from "@/lib/tokens";
import {
  sendMail,
  emailVerificationHtml,
  buildEmailVerificationUrl,
} from "@/lib/mailer";

/** Inscription (e-mail, mot de passe, rôle). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role;

    if (!name || !email || !password) {
      return fail(400, "Nom, e-mail et mot de passe requis.");
    }

    if (role !== "PATIENT" && role !== "DOCTOR") {
      return fail(400, "Rôle invalide.");
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) return fail(400, pwError);

    await connectDB();

    const passwordHash = await hashPassword(password);

    // Token de vérification d'e-mail (valable 24h).
    const emailVerificationToken = randomToken();
    const emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    let created;

    try {
      created = await UserModel.create({
        name,
        email,
        passwordHash,
        role,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
      });
    } catch (e) {
      if (isDuplicateKey(e)) {
        return fail(409, "Cet e-mail est déjà utilisé.");
      }
      throw e;
    }

    // Création automatique du profil médecin.
    if (role === "DOCTOR") {
      try {
        await DoctorProfileModel.create({
          userId: created._id,

          // Informations à compléter par le médecin.
          specialty: "À renseigner",
          city: "À renseigner",
          address: "",

          // Valeurs initiales.
          price: 0,
          availableSlots: [],

          // Horaires désactivés par défaut.
          schedule: {
            slotMinutes: 30,
            days: Array.from({ length: 7 }, () => ({
              enabled: false,
              ranges: [],
            })),
            daysOff: [],
          },

          // Le profil nécessite une vérification.
          verified: true,
          isModerator: false,
        });
      } catch (profileError) {
        // Évite de conserver un compte médecin sans profil.
        await UserModel.findByIdAndDelete(created._id);
        throw profileError;
      }
    }

    // Envoi de l'e-mail de vérification (non bloquant).
    const verifyUrl = buildEmailVerificationUrl(
      emailVerificationToken
    );

    sendMail({
      to: email,
      subject: "Vérifiez votre adresse e-mail — RDV Santé",
      html: emailVerificationHtml(name, verifyUrl),
      text: `Vérifiez votre e-mail : ${verifyUrl}`,
    }).catch(() => {});

    // Pas de connexion automatique.
    return json(
      {
        id: String(created._id),
        name: created.name,
        email: created.email,
        role: created.role,
        emailVerified: false,
        requiresEmailVerification: true,
      },
      201
    );
  } catch (e) {
    return serverError(e);
  }
}
