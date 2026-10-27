import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    // UUID créé dans le navigateur (mode hors-ligne) : sert d'id côté client
    // et rend la synchronisation idempotente.
    clientId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorName: { type: String, required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    type: { type: String, enum: ["REVIEW", "COMPLAINT"], required: true },
    rating: { type: Number, min: 1, max: 5 },
    subject: String,
    content: { type: String, required: true, minlength: 10 },
    response: String,
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
  },
  { timestamps: true }
);

schema.index({ userId: 1, createdAt: -1 });
schema.index({ doctorId: 1, type: 1, status: 1 });
// Un seul avis par rendez-vous
schema.index(
  { appointmentId: 1 },
  { unique: true, partialFilterExpression: { type: "REVIEW" } }
);

export type FeedbackDoc = InferSchemaType<typeof schema>;
export default (models.Feedback as Model<FeedbackDoc>) ||
  model<FeedbackDoc>("Feedback", schema);
