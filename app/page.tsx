"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useSession } from "@/lib/session";
import { SEGMENT_BY_ROLE } from "@/lib/roles";

/** « / » : redirection vers l'espace du profil, ou écran de connexion. */
export default function HomePage() {
  const router = useRouter();
  const { user } = useSession();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && user) router.replace(`/${SEGMENT_BY_ROLE[user.role]}`);
  }, [hydrated, user, router]);

  if (!hydrated || user) {
    return (
      <main>
        <p>Chargement…</p>
      </main>
    );
  }
  return null; // Sidebar/Layout affiche le lien de connexion
}