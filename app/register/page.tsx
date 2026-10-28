"use client";

import { useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setDone(true);
    } catch (err) {
      const e = err as Error & { status?: number };
      setError(e.message || "Échec de l'inscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Inscription</h1>

        {done ? (
          <>
            <p>
              Votre compte a été créé. Un e-mail de vérification a été envoyé à{" "}
              <strong>{email}</strong>. Suivez le lien dans cet e-mail pour
              activer votre compte, puis reconnectez-vous.
            </p>
            <Link href="/login" className="btn-prendre-rdv">
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <p>Créez votre compte RDV Santé.</p>
            <form className="rdv-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="field">
                  <label htmlFor="name">Nom complet</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Adresse e-mail</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">Mot de passe</label>
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
                  <label htmlFor="role">Profil</label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "PATIENT" | "DOCTOR")}
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Médecin</option>
                  </select>
                </div>
              </div>
              {error && <p className="auth-error">{error}</p>}
              <div className="form-section">
                <button type="submit" className="btn-prendre-rdv" disabled={loading}>
                  {loading ? "Création…" : "Créer mon compte"}
                </button>
              </div>
            </form>
            <p className="auth-hint">
              Déjà un compte ? <Link href="/login">Se connecter</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}