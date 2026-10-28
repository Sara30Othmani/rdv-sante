import { NextRequest } from "next/server";
import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken } from "@/lib/tokens";
import { setAuthCookies } from "@/lib/cookies";

/** Connexion par e-mail / mot de passe. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) return fail(400, "E-mail et mot de passe requis.");

    await connectDB();
    const user = await UserModel.findOne({ email, isActive: true }).select(
      "+passwordHash +emailVerified"
    );
    if (!user) return fail(401, "Identifiants invalides.");

    const passwordHash = user.passwordHash as string;
    const ok = await verifyPassword(password, passwordHash);
    if (!ok) return fail(401, "Identifiants invalides.");

    // ⚠ Le compte doit être vérifié avant de pouvoir se connecter.
    if (user.emailVerified !== true) {
      return fail(
        403,
        "Votre adresse e-mail n'est pas encore vérifiée. Suivez le lien reçu par e-mail, ou demandez un nouveau envoi depuis la page de vérification."
      );
    }

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ sub: String(user._id), role: user.role });
    await setAuthCookies(accessToken, refreshToken);

    return json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: true,
    });
  } catch (e) {
    return serverError(e);
  }
}