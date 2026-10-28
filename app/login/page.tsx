"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api";
import { setSession } from "@/lib/session";

type AuthResponse = {
  id: string;
  name: string;
  role: string;
  emailVerified?: boolean;
};

type ApiError = Error & { status?: number };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await apiJson<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(user);
      router.push(user.role === "DOCTOR" ? "/medecin" : "/patient");
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || "Échec de la connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Connexion</h1>
        <p>Accédez à votre espace RDV Santé.</p>
        <form className="rdv-form" onSubmit={handleSubmit}>
          <div className="form-section">
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="form-section">
            <button type="submit" className="btn-prendre-rdv" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <p className="auth-hint">
              <Link href="/forgot-password">Mot de passe oublié ?</Link>
            </p>
          </div>
        </form>
        <p className="auth-hint">
          Pas encore de compte ? <Link href="/register">S&apos;inscrire</Link>
        </p>
      </div>
    </main>
  );
}