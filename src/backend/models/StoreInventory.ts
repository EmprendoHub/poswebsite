import mongoose, { Document, Schema } from "mongoose";

export interface StoreInventoryDocument extends Document {
  store: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  variationId: string; // variation._id as string
  quantity: number;
  minStock: number; // low-stock alert threshold
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const StoreInventorySchema = new Schema<StoreInventoryDocument>(
  {
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variationId: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    minStock: { type: Number, default: 1 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Compound index: one record per store+variation combination
StoreInventorySchema.index({ store: 1, variationId: 1 }, { unique: true });

export default mongoose?.models?.StoreInventory ||
  mongoose.model<StoreInventoryDocument>(
    "StoreInventory",
    StoreInventorySchema,
  );
