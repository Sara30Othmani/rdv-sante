import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const rangeSchema = new Schema(
  { start: { type: String, required: true }, end: { type: String, required: true } },
  { _id: false }
);

const daySchema = new Schema(
  { enabled: { type: Boolean, default: false }, ranges: { type: [rangeSchema], default: [] } },
  { _id: false }
);

// Horaires de travail hebdomadaires (voir lib/schedule.ts)
const scheduleSchema = new Schema(
  {
    slotMinutes: { type: Number, default: 30 },
    days: { type: [daySchema], default: [] }, // 7 entrées, index = jour JS (0 = dimanche)
    daysOff: { type: [String], default: [] }, // congés AAAA-MM-JJ
  },
  { _id: false }
);

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialty: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
    // Ancien format, conservé pour les profils sans `schedule` (lundi → vendredi)
    availableSlots: { type: [String], default: [] },
    // Absent = on retombe sur availableSlots
    schedule: { type: scheduleSchema },
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
