"use client";

import { useState } from "react";
import { useSchedule } from "@/lib/useSchedule";
import { toast } from "sonner";

const DAYS = [
  { id: 1, label: "Lundi" },
  { id: 2, label: "Mardi" },
  { id: 3, label: "Mercredi" },
  { id: 4, label: "Jeudi" },
  { id: 5, label: "Vendredi" },
  { id: 6, label: "Samedi" },
  { id: 0, label: "Dimanche" },
];

export default function ScheduleManager() {
  const { schedule, loading, error, saving, save } = useSchedule();

  const [selectedDay, setSelectedDay] = useState<number>(1);

  if (loading) {
    return <p>Chargement des horaires...</p>;
  }

  if (!schedule) {
    return (
      <p className="text-sm text-red-600">
        {error || "Horaires indisponibles."}
      </p>
    );
  }

  // Activer ou désactiver un jour
  const updateDay = (dayId: number, enabled: boolean) => {
    const updated = {
      ...schedule,
      days: schedule.days.map((day, index) =>
        index === dayId
          ? {
              ...day,
              enabled,
              ranges:
                enabled && day.ranges.length === 0
                  ? [{ start: "09:00", end: "12:00" }]
                  : day.ranges,
            }
          : day,
      ),
    };

    void save(updated);
  };

  // Modifier une plage horaire
  const updateRange = (
    dayId: number,
    rangeIndex: number,
    field: "start" | "end",
    value: string,
  ) => {
    const updated = {
      ...schedule,
      days: schedule.days.map((day, index) =>
        index === dayId
          ? {
              ...day,
              ranges: day.ranges.map((range, i) =>
                i === rangeIndex ? { ...range, [field]: value } : range,
              ),
            }
          : day,
      ),
    };

    void save(updated);
  };

  // Ajouter une plage horaire
  const addRange = (dayId: number) => {
    const updated = {
      ...schedule,
      days: schedule.days.map((day, index) =>
        index === dayId
          ? {
              ...day,
              ranges: [...day.ranges, { start: "09:00", end: "12:00" }],
            }
          : day,
      ),
    };

    void save(updated);
  };

  // Supprimer une plage horaire
  const removeRange = (dayId: number, rangeIndex: number) => {
    const updated = {
      ...schedule,
      days: schedule.days.map((day, index) =>
        index === dayId
          ? {
              ...day,
              ranges: day.ranges.filter((_, i) => i !== rangeIndex),
            }
          : day,
      ),
    };

    void save(updated);
  };

  const selectedSchedule = schedule.days[selectedDay];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Horaires de travail
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Organisez vos disponibilités et vos plages de consultation.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-7">
        {/* Durée consultation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durée d'une consultation
          </label>

          <select
            className="border border-gray-300 rounded-lg px-4 py-2.5 w-full md:w-64 focus:ring-2 focus:ring-teal-500 outline-none"
            value={schedule.slotMinutes}
            onChange={(e) =>
              void save({
                ...schedule,
                slotMinutes: Number(e.target.value),
              })
            }
          >
            {[15, 20, 30, 45, 60].map((duration) => (
              <option key={duration} value={duration}>
                {duration} minutes
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-100" />

        {/* Sélection des jours */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Jours de consultation
          </h3>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const enabled = schedule.days[day.id].enabled;
              const selected = selectedDay === day.id;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDay(day.id)}
                  className={`
                    px-4 py-2.5 rounded-xl text-sm font-medium
                    border transition-all duration-200
                    ${
                      selected
                        ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                        : enabled
                          ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-teal-400"
                    }
                  `}
                >
                  {day.label}

                  {enabled && <span className="ml-2 text-xs">✓</span>}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Sélectionnez un jour pour gérer ses horaires.
          </p>
        </div>

        {/* Configuration du jour sélectionné */}
        {selectedSchedule && (
          <div className="bg-gray-50 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {DAYS.find((d) => d.id === selectedDay)?.label}
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Configuration des disponibilités
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSchedule.enabled}
                  onChange={(e) => updateDay(selectedDay, e.target.checked)}
                  className="w-4 h-4 accent-teal-700"
                />

                <span className="text-sm font-medium text-gray-700">
                  Disponible
                </span>
              </label>
            </div>

            {selectedSchedule.enabled ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Définissez vos plages horaires :
                </p>

                {selectedSchedule.ranges.map((range, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">De</label>

                      <input
                        type="time"
                        className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        value={range.start}
                        onChange={(e) =>
                          updateRange(
                            selectedDay,
                            index,
                            "start",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">À</label>

                      <input
                        type="time"
                        className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        value={range.end}
                        onChange={(e) =>
                          updateRange(selectedDay, index, "end", e.target.value)
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRange(selectedDay, index)}
                      className="text-red-500 hover:text-red-700 text-sm ml-auto"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addRange(selectedDay)}
                  className="text-teal-700 hover:text-teal-900 text-sm font-semibold"
                >
                  + Ajouter une plage horaire
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                Ce jour est actuellement désactivé.
              </p>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Enregistrement */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const success = await save(schedule);

              if (success) {
                toast.success("Horaires enregistrés avec succès !");
              } else {
                toast.error(error || "Erreur lors de l'enregistrement.");
              }
            }}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl px-6 py-3 text-sm font-medium transition-colors"
          >
            {saving ? "Enregistrement..." : "Enregistrer les horaires"}
          </button>
        </div>
      </div>
    </div>
  );
}
