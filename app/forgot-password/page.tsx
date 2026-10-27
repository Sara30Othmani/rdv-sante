"use client";

import { useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiJson("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      // On répond toujours par le même message pour ne pas révéler le compte.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Mot de passe oublié</h1>
        {sent ? (
          <>
            <p>
              Si un compte est associé à <strong>{email}</strong>, vous recevrez un
              e-mail avec un lien pour réinitialiser votre mot de passe.
            </p>
            <Link href="/login" className="btn-prendre-rdv">
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <p>Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</p>
            <form className="rdv-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="field">
                  <label htmlFor="email">Adresse e-mail</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-section">
                <button type="submit" className="btn-prendre-rdv" disabled={loading}>
                  {loading ? "Envoi…" : "Envoyer le lien"}
                </button>
              </div>
            </form>
            <p className="auth-hint">
              <Link href="/login">Retour à la connexion</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}