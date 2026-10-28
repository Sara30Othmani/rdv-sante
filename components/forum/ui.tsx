"use client";
// Éléments d'interface partagés par les pages du forum.
import { useEffect, useRef, type ReactNode } from "react";
import type { Role } from "@/lib/feedbacks/types";
import { AlertIcon, CheckCircleIcon, CloseIcon, ShieldCheckIcon, TrashIcon } from "./icons";

// --- Boutons et champs -------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-teal-700 text-white shadow-xs hover:bg-teal-800",
  secondary: "border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white shadow-xs hover:bg-red-700",
  dangerGhost: "text-red-600 hover:bg-red-50 hover:text-red-700",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-4 text-sm",
};

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-60",
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(" ");
}

export function inputClass(invalid = false) {
  return [
    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] leading-6 text-slate-900 shadow-xs",
    "placeholder:text-slate-400 transition-[border-color,box-shadow] focus:outline-none focus:ring-4",
    invalid
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
      : "border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/15",
  ].join(" ");
}

/** Message d'erreur + compteur sous un champ. */
export function FieldFooter({
  id, error, length, max,
}: { id: string; error?: string | null; length: number; max: number }) {
  return (
    <div id={id} className="mt-1.5 flex items-start justify-between gap-3 text-xs">
      <span className="flex items-start gap-1.5 text-red-600">
        {error && (<><AlertIcon size={14} className="mt-px shrink-0" />{error}</>)}
      </span>
      <span className={`shrink-0 tabular-nums ${length > max ? "text-red-600" : "text-slate-400"}`}>
        {length} / {max}
      </span>
    </div>
  );
}

// --- Identité des auteurs ----------------------------------------------------

function initial(name: string) {
  const clean = name.replace(/^Dr\.?\s*/i, "").trim();
  return (clean[0] ?? "?").toUpperCase();
}

export function Avatar({ name, role, size = "md" }: { name: string; role: Role; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-6 text-[11px]" : "size-9 text-sm";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full font-semibold ${
        role === "DOCTOR" ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-700"
      }`}
    >
      {initial(name)}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  if (role !== "DOCTOR") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-600/20 ring-inset">
      <ShieldCheckIcon size={13} />
      Médecin
    </span>
  );
}

// --- Dates -------------------------------------------------------------------

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000], ["month", 2_592_000], ["week", 604_800],
  ["day", 86_400], ["hour", 3_600], ["minute", 60],
];

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, seconds] of UNITS)
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  return "à l'instant";
}

export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export function TimeAgo({ iso, prefix = "" }: { iso: string; prefix?: string }) {
  return (
    <time dateTime={iso} title={fullDate(iso)}>
      {prefix}{timeAgo(iso)}
    </time>
  );
}

// --- Bandeaux de statut ------------------------------------------------------

export function Notice({
  tone, children, onDismiss, action,
}: { tone: "success" | "error"; children: ReactNode; onDismiss?: () => void; action?: ReactNode }) {
  const success = tone === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        success ? "border-teal-200 bg-teal-50 text-teal-900" : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {success ? <CheckCircleIcon className="mt-px shrink-0" /> : <AlertIcon className="mt-px shrink-0" />}
      <div className="min-w-0 flex-1 whitespace-pre-line">{children}</div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer le message"
          className={`-m-1 rounded-md p-1 opacity-70 hover:opacity-100 ${focusRing}`}
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}

/** Confirmation flottante en bas de l'écran, visible quel que soit le défilement. */
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex justify-center sm:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg motion-safe:animate-[toast-in_180ms_ease-out]" role="status">
        <CheckCircleIcon className="shrink-0 text-teal-300" />
        <span className="flex-1">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer le message"
          className={`-m-1 rounded-md p-1 text-slate-300 hover:text-white ${focusRing}`}
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}

/** Masque un message de succès après quelques secondes. */
export function useAutoDismiss(value: string, clear: () => void, ms = 5000) {
  const clearRef = useRef(clear);
  useEffect(() => {
    clearRef.current = clear;
  });
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(() => clearRef.current(), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
}

// --- États vides / erreurs / accès -------------------------------------------

export function StatePanel({
  icon, title, children, action,
}: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">{icon}</span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      {children && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-600">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// --- Boîte de confirmation ---------------------------------------------------

export function ConfirmDialog({
  open, title, description, confirmLabel, busy, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex gap-4 p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TrashIcon size={20} />
        </span>
        <div>
          <h2 id="confirm-title" className="text-base font-semibold">{title}</h2>
          <div id="confirm-desc" className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
        <button type="button" autoFocus onClick={onCancel} disabled={busy} className={buttonClass("secondary")}>
          Annuler
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={buttonClass("danger")}>
          {busy ? "Suppression…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
