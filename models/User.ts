import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Rempli par le module d'authentification ; jamais renvoyé par défaut.
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ["PATIENT", "DOCTOR"], required: true, index: true },
    phone: String,
    birthDate: Date,
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof schema>;
export default (models.User as Model<UserDoc>) || model<UserDoc>("User", schema);
