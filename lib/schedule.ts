// Horaires de travail d'un médecin — partagé par le navigateur et le serveur.

export type TimeRange = { start: string; end: string }; // "09:00" → "12:00"
export type DaySchedule = { enabled: boolean; ranges: TimeRange[] };
export type WeeklySchedule = {
  /** Durée d'un créneau de rendez-vous, en minutes. */
  slotMinutes: number;
  /** 7 entrées ; l'index est le jour JavaScript (0 = dimanche … 6 = samedi). */
  days: DaySchedule[];
  /** Congés et jours fermés (AAAA-MM-JJ). */
  daysOff: string[];
};

export const SLOT_DURATIONS = [15, 20, 30, 45, 60] as const;
/** Ordre d'affichage : lundi → dimanche. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_LABEL = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;
export const MAX_RANGES_PER_DAY = 4;
export const DEFAULT_RANGES: TimeRange[] = [
  { start: "09:00", end: "12:00" },
  { start: "14:00", end: "17:00" },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const toTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Lundi → vendredi, 9h–12h et 14h–17h, créneaux de 30 min. */
export function defaultSchedule(): WeeklySchedule {
  return {
    slotMinutes: 30,
    days: Array.from({ length: 7 }, (_, wd) => ({
      enabled: wd >= 1 && wd <= 5,
      ranges: wd >= 1 && wd <= 5 ? DEFAULT_RANGES.map((r) => ({ ...r })) : [],
    })),
    daysOff: [],
  };
}

/** Créneaux (« 09:00 », « 09:30 »…) produits par des plages horaires. */
export function slotsOfRanges(ranges: TimeRange[], slotMinutes: number): string[] {
  const out = new Set<string>();
  for (const r of ranges) {
    for (let m = toMinutes(r.start); m + slotMinutes <= toMinutes(r.end); m += slotMinutes) {
      out.add(toTime(m));
    }
  }
  return [...out].sort();
}

/** Créneaux proposés un jour donné (vide si jour fermé, congé ou date invalide). */
export function slotsForDate(schedule: WeeklySchedule, date: string): string[] {
  if (!DATE_RE.test(date) || schedule.daysOff.includes(date)) return [];
  // À midi (heure locale) : le jour de la semaine est celui de la date, quel que soit le fuseau
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const day = schedule.days[weekday];
  return day?.enabled ? slotsOfRanges(day.ranges, schedule.slotMinutes) : [];
}

/** Les prochaines dates où le médecin reçoit (pour la page de réservation). */
export function upcomingWorkingDates(schedule: WeeklySchedule, count: number, horizonDays = 90) {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let i = 0; i < horizonDays && dates.length < count; i++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate()
    ).padStart(2, "0")}`;
    if (slotsForDate(schedule, iso).length > 0) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

type ScheduleLike = {
  slotMinutes?: number | null;
  days?: { enabled?: boolean | null; ranges?: { start: string; end: string }[] | null }[] | null;
  daysOff?: string[] | null;
};

/**
 * Anciens profils : seulement une liste d'heures (`availableSlots`), valable du lundi
 * au vendredi. On la convertit en plages pour garder exactement les mêmes créneaux.
 */
export function scheduleFromLegacy(slots: string[]): WeeklySchedule {
  const ranges: TimeRange[] = [];
  for (const t of [...new Set(slots)].filter((s) => TIME_RE.test(s)).sort()) {
    const start = toMinutes(t);
    const last = ranges[ranges.length - 1];
    if (last && toMinutes(last.end) === start) last.end = toTime(start + 30);
    else ranges.push({ start: t, end: toTime(start + 30) });
  }
  return {
    slotMinutes: 30,
    days: Array.from({ length: 7 }, (_, wd) => {
      const works = wd >= 1 && wd <= 5 && ranges.length > 0;
      return { enabled: works, ranges: works ? ranges.map((r) => ({ ...r })) : [] };
    }),
    daysOff: [],
  };
}

/** Horaires d'un profil : les siens, sinon ceux déduits de l'ancien champ `availableSlots`. */
export function getScheduleOf(profile: {
  schedule?: ScheduleLike | null;
  availableSlots?: string[] | null;
}): WeeklySchedule {
  const s = profile.schedule;

  if (s && Array.isArray(s.days) && s.days.length === 7) {
    return {
      slotMinutes: s.slotMinutes ?? 30,
      days: s.days.map((d) => ({
        enabled: !!d.enabled,
        ranges: (d.ranges ?? []).map((r) => ({
          start: r.start,
          end: r.end,
        })),
      })),
      daysOff: [...(s.daysOff ?? [])],
    };
  }

  // Ancien profil avec des créneaux disponibles
  if (profile.availableSlots?.length) {
    return scheduleFromLegacy(profile.availableSlots);
  }

  // Nouveau profil sans horaires configurés
  return defaultSchedule();
}

/** Vérifie et nettoie des horaires reçus (formulaire ou API). */
export function validateSchedule(
  input: unknown
): { schedule: WeeklySchedule } | { error: string } {
  const s = input as Partial<WeeklySchedule> | null;
  if (!s || typeof s !== "object") return { error: "Horaires invalides." };

  const slotMinutes = s.slotMinutes as number;
  if (!(SLOT_DURATIONS as readonly number[]).includes(slotMinutes))
    return { error: `La durée d'un créneau doit être ${SLOT_DURATIONS.join(", ")} minutes.` };
  if (!Array.isArray(s.days) || s.days.length !== 7) return { error: "Horaires invalides." };

  const days: DaySchedule[] = [];
  for (let wd = 0; wd < 7; wd++) {
    const label = WEEKDAY_LABEL[wd];
    const raw = s.days[wd];
    const ranges = Array.isArray(raw?.ranges) ? raw.ranges : [];
    if (ranges.length > MAX_RANGES_PER_DAY)
      return { error: `${label} : ${MAX_RANGES_PER_DAY} plages horaires au maximum.` };

    const clean: TimeRange[] = [];
    for (const r of ranges) {
      if (!TIME_RE.test(r?.start) || !TIME_RE.test(r?.end))
        return { error: `${label} : heure invalide.` };
      if (toMinutes(r.start) >= toMinutes(r.end))
        return { error: `${label} : l'heure de début doit précéder l'heure de fin.` };
      if (toMinutes(r.end) - toMinutes(r.start) < slotMinutes)
        return {
          error: `${label} : la plage ${r.start}–${r.end} est plus courte qu'un créneau de ${slotMinutes} min.`,
        };
      clean.push({ start: r.start, end: r.end });
    }
    clean.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (let i = 1; i < clean.length; i++) {
      if (toMinutes(clean[i].start) < toMinutes(clean[i - 1].end))
        return { error: `${label} : deux plages horaires se chevauchent.` };
    }
    if (raw?.enabled && clean.length === 0)
      return { error: `${label} : ajoutez une plage horaire ou désactivez ce jour.` };

    days.push({ enabled: !!raw?.enabled, ranges: clean });
  }
  if (!days.some((d) => d.enabled))
    return { error: "Activez au moins un jour de travail (utilisez les congés pour une absence)." };

  const off = Array.isArray(s.daysOff) ? s.daysOff : [];
  if (off.length > 366 || off.some((d) => typeof d !== "string" || !DATE_RE.test(d) || Number.isNaN(Date.parse(d))))
    return { error: "Dates de congé invalides." };

  return { schedule: { slotMinutes, days, daysOff: [...new Set(off)].sort() } };
}
