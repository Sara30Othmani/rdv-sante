import { NextRequest } from "next/server";
import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError } from "@/lib/http";
import { randomToken } from "@/lib/tokens";
import { sendMail, passwordResetHtml, buildPasswordResetUrl } from "@/lib/mailer";

/** Demande de réinitialisation de mot de passe (« mot de passe oublié »). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return fail(400, "E-mail requis.");

    await connectDB();
    const user = await UserModel.findOne({ email, isActive: true });
    // On répond toujours par le même message pour ne pas révéler l'existence du compte.
    if (!user) return json({ ok: true });

    const token = randomToken();
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();

    const resetUrl = buildPasswordResetUrl(token);
    sendMail({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe — RDV Santé",
      html: passwordResetHtml(user.name, resetUrl),
      text: `Réinitialisez votre mot de passe : ${resetUrl}`,
    }).catch(() => {});

    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}