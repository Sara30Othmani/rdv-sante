"use client";
import { users } from "@/lib/mock";
import { useSession } from "@/lib/session";
 
export default function RoleSwitcher() {
  const { user, setUserId } = useSession();
  return (
<select
      value={user.id}
      onChange={(e) => setUserId(e.target.value)}
      className="rounded border bg-white px-2 py-1 text-sm"
      aria-label="Changer d'utilisateur (démo)"
>
      {users.map((u) => (
<option key={u.id} value={u.id}>
          {u.name}
</option>
      ))}
</select>
  );
}