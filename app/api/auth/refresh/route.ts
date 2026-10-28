import { NextRequest } from "next/server";
import { getRefreshCookie } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/tokens";
import { setAuthCookies } from "@/lib/cookies";

/** Rafraîchit le token d'accès à partir du refresh token. */
export async function POST(req: NextRequest) {
  try {
    const token = getRefreshCookie(req);
    if (!token) return fail(401, "Non connecté.");

    const payload = verifyRefreshToken(token);
    if (!payload) return fail(401, "Session expirée.");

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await setAuthCookies(accessToken, refreshToken);

    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}