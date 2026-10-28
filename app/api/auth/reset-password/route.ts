import { NextRequest } from "next/server";
import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError } from "@/lib/http";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { signAccessToken, signRefreshToken } from "@/lib/tokens";
import { setAuthCookies } from "@/lib/cookies";

/** Réinitialisation du mot de passe via le token reçu par e-mail. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (!token || !password) return fail(400, "Token et mot de passe requis.");

    const pwError = validatePasswordStrength(password);
    if (pwError) return fail(400, pwError);

    await connectDB();
    const user = await UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
      isActive: true,
    }).select("+passwordHash");
    if (!user) return fail(400, "Token invalide ou expiré.");

    user.passwordHash = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ sub: String(user._id), role: user.role });
    await setAuthCookies(accessToken, refreshToken);

    return json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });
  } catch (e) {
    return serverError(e);
  }
}