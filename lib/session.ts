//role simulé en attendant le module d'Anis

"use client";

import { useSyncExternalStore } from "react";

import { users } from "./mock";
 
const subscribe = (cb: () => void) => {

  window.addEventListener("session-change", cb);

  return () => window.removeEventListener("session-change", cb);

};

const getSnapshot = () => localStorage.getItem("userId") ?? "p1";

const getServerSnapshot = () => "p1";
 
export function useSession() {

  const userId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const user = users.find((u) => u.id === userId) ?? users[0];

  const setUserId = (id: string) => {

    localStorage.setItem("userId", id);

    window.dispatchEvent(new Event("session-change"));

  };

  return { user, setUserId };

}
 