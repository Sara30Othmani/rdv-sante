"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParam } from "@/lib/use-search-param";
import { apiJson } from "@/lib/api";
import { setSession } from "@/lib/session";

type AuthResponse = {
  id: string;
  name: string;
  role: string;
  emailVerified?: boolean;
};

type ApiError = Error & { status?: number };

export default function VerifyEmailPage() {
  const router = useRouter();
  const token = useSearchParam("token");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!token) {
        if (!cancelled) {
          setError("Token manquant. Veuillez utiliser le lien reçu par e-mail.");
          setLoading(false);
        }
        return;
      }
      try {
        const user = await apiJson<AuthResponse>("/api/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (!cancelled) {
          setSession(user);
          router.push(user.role === "DOCTOR" ? "/medecin" : "/patient");
        }
      } catch (err) {
        const e = err as ApiError;
        if (!cancelled) {
          setError(e.message || "Échec de la vérification.");
          setLoading(false);
        }
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (loading && !error) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p>Vérification en cours…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Vérification d&apos;e-mail</h1>
        {error ? (
          <>
            <p className="auth-error">{error}</p>
            <Link href="/login" className="btn-prendre-rdv">
              Retour à la connexion
            </Link>
          </>
        ) : (
          <p>Votre e-mail a été vérifié.</p>
        )}
      </div>
    </main>
  );
}