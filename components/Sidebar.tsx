"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, useSession } from "@/lib/session";
import { SEGMENT_BY_ROLE, SPACE_LABEL, segmentFromPath, type RoleSegment } from "@/lib/roles";
import OnlineBadge from "./OnlineBadge";
import InstallButton from "./InstallButton";

type MenuItem = {
  label: string;
  href: string;
  match?: string;
  exact?: boolean;
  icon: string;
};

const MENUS: Record<RoleSegment, MenuItem[]> = {
  patient: [
    { label: "Médecins", href: "/patient", exact: true, icon: "▦" },
    { label: "Mes rendez-vous", href: "/patient/rendez-vous", icon: "▣" },
    {
      label: "Mes réclamations & feedback",
      href: "/patient/feedbacks/dashboard",
      match: "/patient/feedbacks",
      icon: "✎",
    },
    { label: "Forum patients", href: "/patient/forum", icon: "❝" },
  ],
  medecin: [
    { label: "Tableau de bord", href: "/medecin", exact: true, icon: "▦" },
    { label: "Profile", href: "/medecin/profil", icon: "▣" },
    { label: "Rendez-vous patients", href: "/medecin/rendez-vous", icon: "▣" },
    {
      label: "Gestion du stock",
      href: "/medecin/stock",
      match: "/medecin/stock",
      icon: "📦",
    },
    {
      label: "Réclamations & feedback",
      href: "/medecin/feedbacks/dashboard",
      match: "/medecin/feedbacks",
      icon: "✎",
    },
    { label: "Forum patients", href: "/medecin/forum", icon: "❝" },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();

  const segment: RoleSegment =
    segmentFromPath(pathname) ?? (user ? SEGMENT_BY_ROLE[user.role] : "patient");

  const isActive = (item: MenuItem) => {
    if (item.exact) return pathname === item.href;
    const prefix = item.match ?? item.href;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  return (
    <aside className="sidebar">
      <Link href={`/${segment}`} className="sidebar-brand">
        <Image src="/med.png" alt="Logo RDV Santé" width={44} height={44} priority />
        <span>
          <strong>RDV Santé</strong>
          <br />
          <small>{SPACE_LABEL[segment]}</small>
        </span>
      </Link>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        {MENUS[segment].map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <OnlineBadge />
          <InstallButton />
        </div>
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">
              {user.role === "PATIENT" ? "Patient" : "Médecin"}
            </span>
          </div>
        )}
        {user ? (
          <button
            type="button"
            className="sidebar-logout"
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              } finally {
                clearSession();
                router.push("/");
              }
            }}
          >
            <span className="sidebar-icon" aria-hidden="true">↪</span>
            <span>Déconnexion</span>
          </button>
        ) : (
          <Link href="/login" className="sidebar-link sidebar-login">
            <span className="sidebar-icon" aria-hidden="true">↗</span>
            <span>Se connecter</span>
          </Link>
        )}
      </div>
    </aside>
  );
}