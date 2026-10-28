"use client";

import { useEffect, useState } from "react";
import { syncPending } from "@/lib/feedbacks/service";
import { syncPendingForum } from "@/lib/forum/service";

export default function OnlineBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        syncPending().catch((e) => console.error("Synchronisation échouée :", e));
        syncPendingForum().catch((e) => console.error("Synchronisation du forum échouée :", e));
      }
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs ${
        online ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
      }`}
    >
      {online ? "En ligne" : "Hors ligne"}
    </span>
  );
}
