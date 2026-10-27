import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const itemSchema = new Schema(
  {
    medicationId: { type: Schema.Types.ObjectId, ref: "Medication", required: true },
    dosage: String,
    frequency: String, // ex. "3 fois par jour"
    durationDays: Number,
    instructions: String,
  },
  { _id: false }
);

const schema = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [itemSchema], default: [] },
    issuedAt: { type: Date, default: Date.now },
    validUntil: Date,
    status: { type: String, enum: ["ACTIVE", "EXPIRED", "CANCELLED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

schema.index({ patientId: 1, issuedAt: -1 });
schema.index({ appointmentId: 1 });

export type PrescriptionDoc = InferSchemaType<typeof schema>;
export default (models.Prescription as Model<PrescriptionDoc>) ||
  model<PrescriptionDoc>("Prescription", schema);
