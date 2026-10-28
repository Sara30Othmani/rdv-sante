"use client";

import { useRouter } from "next/navigation";
import { useDemoUsers } from "@/lib/useDemoUsers";
import { setSession } from "@/lib/session";
import { SEGMENT_BY_ROLE } from "@/lib/roles";

/** Écran de connexion de démonstration : on choisit un profil. */
export default function ProfilePicker() {
  const router = useRouter();
  const { users, loading, error } = useDemoUsers();

  const groups = [
    { title: "Patients", users: users.filter((u) => u.role === "PATIENT") },
    { title: "Médecins", users: users.filter((u) => u.role === "DOCTOR") },
  ];

  return (
    <main className="access-denied">
      <h1>Choisissez un profil</h1>
      <p>Connexion de démonstration, en attendant le module d&apos;authentification.</p>

      {loading && <p>Chargement…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {groups.map(
        (group) =>
          group.users.length > 0 && (
            <section key={group.title} className="profile-group">
              <h2>{group.title}</h2>
              <div className="profile-list">
                {group.users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSession(u);
                      router.push(`/${SEGMENT_BY_ROLE[u.role]}`);
                    }}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </section>
          )
      )}
    </main>
  );
}
