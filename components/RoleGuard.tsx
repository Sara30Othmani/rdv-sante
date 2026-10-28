"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useHydrated, useSession } from "@/lib/session";
import { ROLE_BY_SEGMENT, SEGMENT_BY_ROLE, SPACE_LABEL, type RoleSegment } from "@/lib/roles";

/**
 * Protège un espace (/patient, /medecin) : l'URL choisit l'espace, la session
 * doit correspondre. Sinon : écran de connexion, ou message « accès réservé ».
 *
 * ⚠ Protection d'interface uniquement : la sécurité réelle est dans les routes /api.
 */
export default function RoleGuard({
  segment,
  children,
}: {
  segment: RoleSegment;
  children: ReactNode;
}) {
  const { user } = useSession();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <main>
        <p>Chargement…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="access-denied">
        <h1>Connexion requise</h1>
        <p>Vous devez être connecté pour accéder à {SPACE_LABEL[segment].toLowerCase()}.</p>
        <Link href="/login" className="btn-prendre-rdv">
          Se connecter
        </Link>
      </main>
    );
  }

  if (user.role === ROLE_BY_SEGMENT[segment]) return <>{children}</>;

  return (
    <main className="access-denied">
      <h1>Accès réservé</h1>
      <p>
        Cette page fait partie de l&apos;{SPACE_LABEL[segment].toLowerCase()}. Vous
        êtes connecté en tant que <strong>{user.name}</strong>.
      </p>
      <Link href={`/${SEGMENT_BY_ROLE[user.role]}`} className="btn-prendre-rdv">
        Aller à mon espace
      </Link>
    </main>
  );
}