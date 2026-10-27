"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfilePicker from "@/components/ProfilePicker";
import { useHydrated, useSession } from "@/lib/session";
import { SEGMENT_BY_ROLE } from "@/lib/roles";

/** « / » : connexion de démonstration, ou redirection vers l'espace du profil. */
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
  return <ProfilePicker />;
}
