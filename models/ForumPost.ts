import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ["PATIENT", "DOCTOR"], required: true }, // badge « Médecin »
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
    category: { type: String, default: "GENERAL" },
    tags: { type: [String], default: [] },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    likedBy: { type: [Schema.Types.ObjectId], default: [] },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    status: { type: String, enum: ["PUBLISHED", "HIDDEN", "DELETED"], default: "PUBLISHED" },
  },
  { timestamps: true }
);

schema.index({ category: 1, createdAt: -1 });
schema.index({ title: "text", content: "text" });

export type ForumPostDoc = InferSchemaType<typeof schema>;
export default (models.ForumPost as Model<ForumPostDoc>) ||
  model<ForumPostDoc>("ForumPost", schema);
