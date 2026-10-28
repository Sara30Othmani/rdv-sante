import { cookies } from "next/headers";

const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/** Définit les cookies de session (appelé depuis les routes API). */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  store.set("access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  store.set("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

/** Supprime les cookies de session (déconnexion). */
export async function clearAuthCookies() {
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  store.set("access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  store.set("refresh_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}