import { NextRequest } from "next/server";
import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError, isDuplicateKey } from "@/lib/http";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { randomToken } from "@/lib/tokens";
import { sendMail, emailVerificationHtml, buildEmailVerificationUrl } from "@/lib/mailer";

/** Inscription (e-mail, mot de passe, rôle). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role;

    if (!name || !email || !password) return fail(400, "Nom, e-mail et mot de passe requis.");
    if (role !== "PATIENT" && role !== "DOCTOR") return fail(400, "Rôle invalide.");

    const pwError = validatePasswordStrength(password);
    if (pwError) return fail(400, pwError);

    await connectDB();

    const passwordHash = await hashPassword(password);

    // Token de vérification d'e-mail (valable 24h).
    const emailVerificationToken = randomToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
      if (isDuplicateKey(e)) return fail(409, "Cet e-mail est déjà utilisé.");
      throw e;
    }

    // Envoi de l'e-mail de vérification (non bloquant).
    const verifyUrl = buildEmailVerificationUrl(emailVerificationToken);
    sendMail({
      to: email,
      subject: "Vérifiez votre adresse e-mail — RDV Santé",
      html: emailVerificationHtml(name, verifyUrl),
      text: `Vérifiez votre e-mail : ${verifyUrl}`,
    }).catch(() => {});

    // ⚠ Pas de connexion automatique : l'e-mail doit être vérifié avant d'accéder à l'espace.
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