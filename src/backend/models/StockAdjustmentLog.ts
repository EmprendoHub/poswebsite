import mongoose, { Document, Schema } from "mongoose";

export interface StockAdjustmentLogDocument extends Document {
  store: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  variationId: string;
  delta: number; // + / - stock movement
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const StockAdjustmentLogSchema = new Schema<StockAdjustmentLogDocument>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variationId: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },
  },
  { timestamps: true },
);

StockAdjustmentLogSchema.index({
  store: 1,
  product: 1,
  variationId: 1,
  createdAt: -1,
});

export default mongoose.models.StockAdjustmentLog ||
  mongoose.model<StockAdjustmentLogDocument>(
    "StockAdjustmentLog",
    StockAdjustmentLogSchema,
  );
