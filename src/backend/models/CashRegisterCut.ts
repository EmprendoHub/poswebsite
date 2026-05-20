import mongoose, { Document, Schema } from "mongoose";

export interface CashRegisterCutDocument extends Document {
  session: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  storeName: string;
  type: "corte" | "cierre";
  cutNumber: number;
  periodStart: Date;
  periodEnd: Date;
  generatedBy: mongoose.Types.ObjectId;
  generatedByName: string;
  declaredCash: number;
  expectedCash: number;
  difference: number;
  totals: {
    cashSales: number;
    cardSales: number;
    mixedCashSales: number;
    mixedCardSales: number;
    inflows: number;
    outflows: number;
    totalSales: number;
  };
  movementsCount: number;
  salesCount: number;
  notes?: string;
}

const CashRegisterCutSchema = new Schema<CashRegisterCutDocument>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "CashRegisterSession",
      required: true,
      index: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    storeName: { type: String, required: true },
    type: {
      type: String,
      enum: ["corte", "cierre"],
      required: true,
      index: true,
    },
    cutNumber: { type: Number, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    generatedByName: { type: String, required: true },
    declaredCash: { type: Number, required: true },
    expectedCash: { type: Number, required: true },
    difference: { type: Number, required: true },
    totals: {
      cashSales: { type: Number, default: 0 },
      cardSales: { type: Number, default: 0 },
      mixedCashSales: { type: Number, default: 0 },
      mixedCardSales: { type: Number, default: 0 },
      inflows: { type: Number, default: 0 },
      outflows: { type: Number, default: 0 },
      totalSales: { type: Number, default: 0 },
    },
    movementsCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true },
);

CashRegisterCutSchema.index({ store: 1, createdAt: -1 });
CashRegisterCutSchema.index({ session: 1, cutNumber: 1 }, { unique: true });

export default mongoose.models.CashRegisterCut ||
  mongoose.model<CashRegisterCutDocument>(
    "CashRegisterCut",
    CashRegisterCutSchema,
  );
