import mongoose, { Document, Schema } from "mongoose";

export interface CashRegisterMovementDocument extends Document {
  session: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  type: "sale" | "manual_in" | "manual_out";
  payMethod: "EFECTIVO" | "TERMINAL" | "MIXTO" | "N/A";
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
  order?: mongoose.Types.ObjectId;
  orderId?: number;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  authorizedById?: mongoose.Types.ObjectId;
  authorizedByName?: string;
  notes?: string;
  createdAt?: Date;
}

const CashRegisterMovementSchema = new Schema<CashRegisterMovementDocument>(
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
    type: {
      type: String,
      enum: ["sale", "manual_in", "manual_out"],
      required: true,
      default: "sale",
    },
    payMethod: {
      type: String,
      enum: ["EFECTIVO", "TERMINAL", "MIXTO", "N/A"],
      default: "N/A",
    },
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderId: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },
    authorizedById: { type: Schema.Types.ObjectId, ref: "User" },
    authorizedByName: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

CashRegisterMovementSchema.index({ session: 1, createdAt: 1 });

export default mongoose.models.CashRegisterMovement ||
  mongoose.model<CashRegisterMovementDocument>(
    "CashRegisterMovement",
    CashRegisterMovementSchema,
  );
