import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: String,
    form: {
      type: String,
      enum: ["TABLET", "CAPSULE", "SYRUP", "INJECTION", "CREAM", "DROPS", "OTHER"],
      default: "TABLET",
    },
    dosage: String, // ex. "500 mg"
    category: String,
    manufacturer: String,
    requiresPrescription: { type: Boolean, default: false },
    contraindications: { type: [String], default: [] },
    sideEffects: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

schema.index({ name: "text", genericName: "text" });
schema.index({ category: 1 });

export type MedicationDoc = InferSchemaType<typeof schema>;
export default (models.Medication as Model<MedicationDoc>) ||
  model<MedicationDoc>("Medication", schema);
