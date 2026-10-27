import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Signalements traités par les médecins modérateurs (il n'y a pas d'administrateur).
// Règle côté API : à 3 signalements distincts, le contenu passe en HIDDEN.
const schema = new Schema(
  {
    targetType: { type: String, enum: ["POST", "COMMENT"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ["OPEN", "REVIEWED", "DISMISSED"], default: "OPEN" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Un utilisateur ne peut signaler un contenu qu'une fois
schema.index({ targetType: 1, targetId: 1, reporterId: 1 }, { unique: true });
schema.index({ status: 1, createdAt: -1 });

export type ForumReportDoc = InferSchemaType<typeof schema>;
export default (models.ForumReport as Model<ForumReportDoc>) ||
  model<ForumReportDoc>("ForumReport", schema);
