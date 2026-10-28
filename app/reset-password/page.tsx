"use client";

import { useState } from "react";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParam("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Token manquant. Veuillez utiliser le lien reçu par e-mail.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await apiJson<AuthResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSession(user);
      setDone(true);
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || "Échec de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Nouveau mot de passe</h1>
        {done ? (
          <>
            <p>Votre mot de passe a été réinitialisé. Vous êtes maintenant connecté.</p>
            <button
              type="button"
              className="btn-prendre-rdv"
              onClick={() => router.push("/")}
            >
              Aller à mon espace
            </button>
          </>
        ) : (
          <>
            <p>Choisissez un nouveau mot de passe.</p>
            <form className="rdv-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="field">
                  <label htmlFor="password">Nouveau mot de passe</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <small className="auth-hint">
                    Au moins 8 caractères, une majuscule et un chiffre.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="confirm">Confirmer le mot de passe</label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="auth-error">{error}</p>}
              <div className="form-section">
                <button type="submit" className="btn-prendre-rdv" disabled={loading}>
                  {loading ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
            <p className="auth-hint">
              <Link href="/forgot-password">Renvoyer un lien</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}