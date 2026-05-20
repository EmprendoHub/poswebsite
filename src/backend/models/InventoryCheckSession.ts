import mongoose, { Document, Schema } from "mongoose";

export interface ScannedItem {
  variationId: string;
  productId: string;
  productTitle: string;
  variationTitle?: string;
  sku?: string;
  image?: string;
  physicalCount: number;
  systemCount: number;
  difference: number;
}

export interface InventoryCheckSessionDocument extends Document {
  store: mongoose.Types.ObjectId;
  storeName: string;
  status: "in_progress" | "finalized";
  scannedItems: ScannedItem[];
  startedBy: mongoose.Types.ObjectId;
  startedByName: string;
  startedAt: Date;
  finalizedAt?: Date;
  totalScanned: number;
  totalMatched: number;
  totalDiscrepancies: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ScannedItemSchema = new Schema<ScannedItem>(
  {
    variationId: { type: String, required: true },
    productId: { type: String, required: true },
    productTitle: { type: String, required: true },
    variationTitle: { type: String },
    sku: { type: String },
    image: { type: String },
    physicalCount: { type: Number, required: true, default: 0 },
    systemCount: { type: Number, required: true, default: 0 },
    difference: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const InventoryCheckSessionSchema = new Schema<InventoryCheckSessionDocument>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    storeName: { type: String, required: true },
    status: {
      type: String,
      enum: ["in_progress", "finalized"],
      default: "in_progress",
    },
    scannedItems: [ScannedItemSchema],
    startedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedByName: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    finalizedAt: { type: Date },
    totalScanned: { type: Number, default: 0 },
    totalMatched: { type: Number, default: 0 },
    totalDiscrepancies: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.InventoryCheckSession ||
  mongoose.model<InventoryCheckSessionDocument>(
    "InventoryCheckSession",
    InventoryCheckSessionSchema,
  );
