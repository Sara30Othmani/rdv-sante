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
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof schema>;
export default (models.User as Model<UserDoc>) || model<UserDoc>("User", schema);
