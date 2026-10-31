// Conversion document MongoDB → objet envoyé au navigateur (côté serveur uniquement).
import type { AppointmentDoc } from "@/models/Appointment";
import type { FeedbackDoc } from "@/models/Feedback";
import { STATUS_LABEL, type Appointment } from "./appointments";
import type { Feedback } from "./feedbacks/types";
import type { StockItem, StockMovement, StockStatus, ExpirationStatus } from "./stock/types";

type WithId<T> = T & { _id: unknown; createdAt?: Date; updatedAt?: Date };

export function toAppointmentDTO(a: WithId<AppointmentDoc>): Appointment {
  return {
    id: String(a._id),
    patientId: String(a.patientId),
    patientName: a.patientName,
    doctorId: String(a.doctorId),
    doctorName: a.doctorName,
    specialty: a.specialty,
    date: a.date,
    time: a.time,
    reason: a.reason,
    status: STATUS_LABEL[a.status],
    notes: a.notes ?? "",
    cancelReason: a.cancelReason ?? undefined,
  };
}

export function toFeedbackDTO(f: WithId<FeedbackDoc>): Feedback {
  return {
    id: f.clientId,
    user_id: String(f.userId),
    user_name: f.userName,
    doctor_id: String(f.doctorId),
    doctor_name: f.doctorName,
    appointment_id: String(f.appointmentId),
    type: f.type,
    rating: f.rating ?? undefined,
    subject: f.subject ?? undefined,
    content: f.content,
    response: f.response ?? undefined,
    status: f.status,
    created_at: (f.createdAt ?? new Date()).toISOString(),
    updated_at: (f.updatedAt ?? new Date()).toISOString(),
    syncStatus: "synced",
  };
}

export function toStockItemDTO(item: any): StockItem {
  const med = item.medicationId && typeof item.medicationId === "object" ? item.medicationId : null;
  const medId = med ? String(med._id) : String(item.medicationId);

  const batches = (item.batches || []).map((b: any) => ({
    batchNumber: b.batchNumber,
    quantity: b.quantity,
    expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
  }));

  const qty = Number(item.quantity) || 0;
  const threshold = typeof item.lowStockThreshold === "number" ? item.lowStockThreshold : 5;
  const status: StockStatus =
    qty === 0 ? "OUT_OF_STOCK" : qty <= threshold ? "LOW_STOCK" : "IN_STOCK";

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let expirationStatus: ExpirationStatus = "OK";
  let nearestExpiration: string | null = null;

  for (const b of batches) {
    if (b.expiresAt) {
      const expDate = new Date(b.expiresAt);
      if (!nearestExpiration || expDate < new Date(nearestExpiration)) {
        nearestExpiration = b.expiresAt;
      }
      if (expDate <= now) {
        expirationStatus = "EXPIRED";
      } else if (expDate <= thirtyDaysLater && expirationStatus !== "EXPIRED") {
        expirationStatus = "EXPIRING_SOON";
      }
    }
  }

  return {
    id: String(item._id),
    doctorId: String(item.doctorId),
    medicationId: medId,
    medication: {
      id: medId,
      name: med?.name || "Article sans nom",
      genericName: med?.genericName || "",
      form: med?.form || "OTHER",
      dosage: med?.dosage || "",
      category: med?.category || "Matériel / Médicament",
      manufacturer: med?.manufacturer || "",
    },
    quantity: qty,
    lowStockThreshold: threshold,
    unit: item.unit || "boîte",
    location: item.location || "",
    batches,
    status,
    expirationStatus,
    nearestExpiration,
    createdAt: (item.createdAt ? new Date(item.createdAt) : new Date()).toISOString(),
    updatedAt: (item.updatedAt ? new Date(item.updatedAt) : new Date()).toISOString(),
  };
}

export function toStockMovementDTO(m: any): StockMovement {
  return {
    id: String(m._id),
    stockItemId: String(m.stockItemId),
    doctorId: String(m.doctorId),
    type: m.type,
    quantity: m.quantity,
    batchNumber: m.batchNumber || "",
    reason: m.reason || "",
    prescriptionId: m.prescriptionId ? String(m.prescriptionId) : undefined,
    createdBy: m.createdBy ? String(m.createdBy) : undefined,
    createdAt: (m.createdAt ? new Date(m.createdAt) : new Date()).toISOString(),
  };
}
