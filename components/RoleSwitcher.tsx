"use client";

import { useRouter } from "next/navigation";
import { useDemoUsers } from "@/lib/useDemoUsers";
import { setSession, useSession } from "@/lib/session";
import { SEGMENT_BY_ROLE } from "@/lib/roles";

/** Sélecteur de profil de démonstration : change l'utilisateur ET l'espace (URL). */
export default function RoleSwitcher() {
  const { user } = useSession();
  const router = useRouter();
  const { users } = useDemoUsers();

  if (!user) return null;

  function handleChange(id: string) {
    const next = users.find((u) => u.id === id);
    if (!next) return;
    setSession(next);
    router.push(`/${SEGMENT_BY_ROLE[next.role]}`);
  }

  // Tant que la liste n'est pas chargée, on affiche au moins le profil actuel
  const options = users.length > 0 ? users : [user];

  return (
    <label className="role-switcher">
      <span>Profil (démo)</span>
      <select
        value={user.id}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Changer de profil (démo)"
      >
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
