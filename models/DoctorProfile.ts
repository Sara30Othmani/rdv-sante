import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialty: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
    availableSlots: { type: [String], default: [] }, // ex. ["09:00", "10:00"]
    // Un médecin n'apparaît dans la liste et n'accède au stock qu'une fois vérifié.
    verified: { type: Boolean, default: false },
    licenseNumber: String,
    // Peut traiter les signalements du forum (pas d'administrateur).
    isModerator: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.index({ specialty: 1, city: 1 });

export type DoctorProfileDoc = InferSchemaType<typeof schema>;
export default (models.DoctorProfile as Model<DoctorProfileDoc>) ||
  model<DoctorProfileDoc>("DoctorProfile", schema);
