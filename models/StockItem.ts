import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const batchSchema = new Schema(
  {
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    expiresAt: Date,
  },
  { _id: false }
);

// Un document par médicament et par médecin
const schema = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    medicationId: { type: Schema.Types.ObjectId, ref: "Medication", required: true },
    quantity: { type: Number, default: 0, min: 0 }, // total, maintenu avec les mouvements
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    unit: { type: String, default: "boîte" },
    location: String,
    batches: { type: [batchSchema], default: [] },
  },
  { timestamps: true }
);

schema.index({ doctorId: 1, medicationId: 1 }, { unique: true });
schema.index({ doctorId: 1, quantity: 1 }); // alertes de stock bas
schema.index({ "batches.expiresAt": 1 }); // alertes de péremption

export type StockItemDoc = InferSchemaType<typeof schema>;
export default (models.StockItem as Model<StockItemDoc>) ||
  model<StockItemDoc>("StockItem", schema);
