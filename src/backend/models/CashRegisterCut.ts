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
    transfers: number;
    mixedTransferSales: number;
    inflows: number;
    outflows: number;
    totalSales: number;
    cancelledOrdersCount?: number;
    cancelledOrdersTotal?: number;
    cancelledOrders?: {
      orderId: number;
      amount: number;
      cancelledBy: string | null;
    }[];
  };
  paymentMethods?: {
    inStore?: {
      efectivo?: number;
      transferencia?: number;
      tarjeta?: number;
    };
    online?: {
      transferencia?: number;
      tarjeta?: number;
    };
    redesSociales?: {
      transferencia?: number;
      tarjeta?: number;
    };
  };
  gastos?: {
    items: {
      description: string;
      amount: number;
      category: string;
      createdBy: string;
      createdAt: Date;
    }[];
    total: number;
  };
  movements?: {
    type: "manual_in" | "manual_out";
    cashAmount: number;
    notes?: string;
    createdByName?: string;
    authorizedByName?: string;
    createdAt: Date;
  }[];
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
      transfers: { type: Number, default: 0 },
      mixedTransferSales: { type: Number, default: 0 },
      inflows: { type: Number, default: 0 },
      outflows: { type: Number, default: 0 },
      totalSales: { type: Number, default: 0 },
      cancelledOrdersCount: { type: Number, default: 0 },
      cancelledOrdersTotal: { type: Number, default: 0 },
      cancelledOrders: [
        {
          orderId: { type: Number },
          amount: { type: Number },
          cancelledBy: { type: String, default: null },
        },
      ],
    },
    paymentMethods: {
      inStore: {
        efectivo: { type: Number, default: 0 },
        transferencia: { type: Number, default: 0 },
        tarjeta: { type: Number, default: 0 },
      },
      online: {
        transferencia: { type: Number, default: 0 },
        tarjeta: { type: Number, default: 0 },
      },
      redesSociales: {
        transferencia: { type: Number, default: 0 },
        tarjeta: { type: Number, default: 0 },
      },
    },
    gastos: {
      items: [
        {
          description: { type: String, required: true },
          amount: { type: Number, required: true },
          category: { type: String, required: true },
          createdBy: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      total: { type: Number, default: 0 },
    },
    movements: [
      {
        type: { type: String, enum: ["manual_in", "manual_out"], required: true },
        cashAmount: { type: Number, required: true },
        notes: { type: String },
        createdByName: { type: String },
        authorizedByName: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
