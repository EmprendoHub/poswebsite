import mongoose, { Document, Schema } from "mongoose";

export interface ArqueoPaymentMethodData {
  expectedAmount: number;
  receivedAmount: number;
  discrepancy: number;
  verified: boolean;
}

export interface ArqueoDocument extends Document {
  store: mongoose.Types.ObjectId;
  storeName: string;
  date: Date;
  performedBy: mongoose.Types.ObjectId;
  performedByName: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  inStore: {
    efectivo: ArqueoPaymentMethodData;
    transferencia: ArqueoPaymentMethodData;
    tarjeta: ArqueoPaymentMethodData;
  };
  online: {
    transferencia: ArqueoPaymentMethodData;
    tarjeta: ArqueoPaymentMethodData;
  };
  redesSociales: {
    transferencia: ArqueoPaymentMethodData;
    tarjeta: ArqueoPaymentMethodData;
  };
  gastos?: {
    expectedTotal: number;
    actualTotal: number;
    discrepancy: number;
    verified: boolean;
    items: {
      description: string;
      amount: number;
      category: string;
      createdBy: string;
      verified: boolean;
    }[];
  };
  totals: {
    expectedTotal: number;
    receivedTotal: number;
    totalDiscrepancy: number;
  };
  allVerified: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ArqueoPaymentMethodSchema = new Schema(
  {
    expectedAmount: { type: Number, required: true, default: 0 },
    receivedAmount: { type: Number, required: true, default: 0 },
    discrepancy: { type: Number, required: true, default: 0 },
    verified: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const ArqueoSchema = new Schema<ArqueoDocument>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    storeName: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, required: true },
    dateRange: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    inStore: {
      efectivo: ArqueoPaymentMethodSchema,
      transferencia: ArqueoPaymentMethodSchema,
      tarjeta: ArqueoPaymentMethodSchema,
    },
    online: {
      transferencia: ArqueoPaymentMethodSchema,
      tarjeta: ArqueoPaymentMethodSchema,
    },
    redesSociales: {
      transferencia: ArqueoPaymentMethodSchema,
      tarjeta: ArqueoPaymentMethodSchema,
    },
    gastos: {
      expectedTotal: { type: Number, default: 0 },
      actualTotal: { type: Number, default: 0 },
      discrepancy: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
      items: [
        {
          description: { type: String, required: true },
          amount: { type: Number, required: true },
          category: { type: String, required: true },
          createdBy: { type: String, required: true },
          verified: { type: Boolean, default: false },
        },
      ],
    },
    totals: {
      expectedTotal: { type: Number, required: true, default: 0 },
      receivedTotal: { type: Number, required: true, default: 0 },
      totalDiscrepancy: { type: Number, required: true, default: 0 },
    },
    allVerified: { type: Boolean, required: true, default: false },
    notes: { type: String },
  },
  { timestamps: true },
);

ArqueoSchema.index({ store: 1, date: -1 });
ArqueoSchema.index({ store: 1, "dateRange.startDate": 1 });

export default mongoose.models.Arqueo ||
  mongoose.model<ArqueoDocument>("Arqueo", ArqueoSchema);
