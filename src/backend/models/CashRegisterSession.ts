import mongoose, { Document, Schema } from "mongoose";

export interface CashRegisterSessionDocument extends Document {
  store: mongoose.Types.ObjectId;
  storeName: string;
  openedBy: mongoose.Types.ObjectId;
  openedByName: string;
  openedAt: Date;
  openingCash: number;
  status: "open" | "closed";
  lastCutAt: Date;
  totals: {
    cashSales: number;
    cardSales: number;
    mixedCashSales: number;
    mixedCardSales: number;
    inflows: number;
    outflows: number;
  };
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  closedByName?: string;
  closingDeclaredCash?: number;
  closingExpectedCash?: number;
  closingDifference?: number;
  notes?: string;
}

const CashRegisterSessionSchema = new Schema<CashRegisterSessionDocument>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    storeName: { type: String, required: true },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    openedByName: { type: String, required: true },
    openedAt: { type: Date, default: Date.now, index: true },
    openingCash: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    lastCutAt: { type: Date, default: Date.now },
    totals: {
      cashSales: { type: Number, default: 0 },
      cardSales: { type: Number, default: 0 },
      mixedCashSales: { type: Number, default: 0 },
      mixedCardSales: { type: Number, default: 0 },
      inflows: { type: Number, default: 0 },
      outflows: { type: Number, default: 0 },
    },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedByName: { type: String },
    closingDeclaredCash: { type: Number },
    closingExpectedCash: { type: Number },
    closingDifference: { type: Number },
    notes: { type: String },
  },
  { timestamps: true },
);

CashRegisterSessionSchema.index(
  { store: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } },
);

export default mongoose.models.CashRegisterSession ||
  mongoose.model<CashRegisterSessionDocument>(
    "CashRegisterSession",
    CashRegisterSessionSchema,
  );
