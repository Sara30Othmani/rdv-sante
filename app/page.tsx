"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useSession } from "@/lib/session";
import { SEGMENT_BY_ROLE } from "@/lib/roles";

/** « / » : espace du profil si connecté, sinon page d'inscription. */
export default function HomePage() {
  const router = useRouter();
  const { user } = useSession();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (user) {
      router.replace(`/${SEGMENT_BY_ROLE[user.role]}`);
    } else {
      router.replace("/register");
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <main>
        <p>Chargement…</p>
      </main>
    );
  }
  return null;
}