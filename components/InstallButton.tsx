"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await evt.prompt();
        setEvt(null);
      }}
      className="rounded-full bg-sky-600 px-3 py-1 text-xs text-white"
    >
      Installer l&apos;app
    </button>
  );
}
