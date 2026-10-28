import { NextRequest } from "next/server";
import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError } from "@/lib/http";
import { signAccessToken, signRefreshToken } from "@/lib/tokens";
import { setAuthCookies } from "@/lib/cookies";

/** Vérification d'adresse e-mail via le token reçu par e-mail. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    if (!token) return fail(400, "Token requis.");

    await connectDB();
    const user = await UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
      isActive: true,
    }).select("+passwordHash");
    if (!user) return fail(400, "Token invalide ou expiré.");

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

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