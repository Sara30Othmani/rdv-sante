import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Copies figées au moment de la réservation (historique stable)
    patientName: { type: String, required: true },
    doctorName: { type: String, required: true },
    specialty: { type: String, required: true },
    // Date et heure en texte : évite tout décalage de fuseau horaire
    date: { type: String, required: true }, // AAAA-MM-JJ
    time: { type: String, required: true }, // HH:MM
    reason: { type: String, required: true, minlength: 5, maxlength: 500 },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REFUSED", "CANCELLED", "DONE"],
      default: "PENDING",
    },
    notes: { type: String, default: "", maxlength: 2000 },
    cancelReason: { type: String, maxlength: 500 }, // motif saisi par le patient à l'annulation
    price: Number,
  },
  { timestamps: true }
);

schema.index({ patientId: 1, date: -1 });
schema.index({ doctorId: 1, date: 1 });
// Interdit la double réservation d'un même créneau chez un médecin
schema.index(
  { doctorId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING", "ACCEPTED"] } },
  }
);

export type AppointmentDoc = InferSchemaType<typeof schema>;
export default (models.Appointment as Model<AppointmentDoc>) ||
  model<AppointmentDoc>("Appointment", schema);
