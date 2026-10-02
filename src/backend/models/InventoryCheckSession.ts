import mongoose, { Document, Schema } from "mongoose";

export interface ScannedItem {
  variationId: string;
  productId: string;
  productTitle: string;
  variationTitle?: string;
  sku?: string;
  image?: string;
  price?: number;
  physicalCount: number;
  systemCount: number;
  difference: number;
  note?: string;
  isDiscrepancy?: boolean;
}

export interface SelectedProduct {
  productId: string;
  productTitle: string;
  variationId: string;
  variationTitle?: string;
  sku?: string;
  image?: string;
  price?: number;
  systemCount: number;
}

export interface InventoryCheckSessionDocument extends Document {
  store: mongoose.Types.ObjectId;
  storeName: string;
  status: "in_progress" | "finalized";
  selectedProducts: SelectedProduct[]; // productos a inventariar (pre-seleccionados)
  scannedItems: ScannedItem[]; // productos escaneados/contados
  filters?: {
    mainCategory?: string;
    subCategory?: string;
    attributes?: string[];
  };
  startedBy: mongoose.Types.ObjectId;
  startedByName: string;
  startedAt: Date;
  finalizedAt?: Date;
  totalSelected: number;
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
    price: { type: Number },
    physicalCount: { type: Number, required: true, default: 0 },
    systemCount: { type: Number, required: true, default: 0 },
    difference: { type: Number, required: true, default: 0 },
    note: { type: String },
    isDiscrepancy: { type: Boolean, default: false },
  },
  { _id: false },
);

const SelectedProductSchema = new Schema<SelectedProduct>(
  {
    productId: { type: String, required: true },
    productTitle: { type: String, required: true },
    variationId: { type: String, required: true },
    variationTitle: { type: String },
    sku: { type: String },
    image: { type: String },
    price: { type: Number },
    systemCount: { type: Number, required: true, default: 0 },
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
    selectedProducts: [SelectedProductSchema],
    scannedItems: [ScannedItemSchema],
    filters: {
      mainCategory: { type: String },
      subCategory: { type: String },
      attributes: [{ type: String }],
    },
    startedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedByName: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    finalizedAt: { type: Date },
    totalSelected: { type: Number, default: 0 },
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
