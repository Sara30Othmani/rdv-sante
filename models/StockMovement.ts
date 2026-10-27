import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Journal : on ajoute des lignes, on n'en modifie ni n'en supprime jamais.
const schema = new Schema(
  {
    stockItemId: { type: Schema.Types.ObjectId, ref: "StockItem", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["IN", "OUT", "ADJUSTMENT", "EXPIRED"], required: true },
    quantity: { type: Number, required: true },
    batchNumber: String,
    reason: String,
    prescriptionId: { type: Schema.Types.ObjectId, ref: "Prescription" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ stockItemId: 1, createdAt: -1 });

export type StockMovementDoc = InferSchemaType<typeof schema>;
export default (models.StockMovement as Model<StockMovementDoc>) ||
  model<StockMovementDoc>("StockMovement", schema);
