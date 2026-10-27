import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Collection séparée : le nombre de commentaires d'un post n'a pas de limite.
const schema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ["PATIENT", "DOCTOR"], required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "ForumComment", default: null },
    content: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: ["PUBLISHED", "HIDDEN", "DELETED"], default: "PUBLISHED" },
  },
  { timestamps: true }
);

schema.index({ postId: 1, createdAt: 1 });

export type ForumCommentDoc = InferSchemaType<typeof schema>;
export default (models.ForumComment as Model<ForumCommentDoc>) ||
  model<ForumCommentDoc>("ForumComment", schema);
