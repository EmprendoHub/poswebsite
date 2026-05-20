import mongoose, { Document, Schema } from "mongoose";

export type ExpenseCategory =
  | "renta"
  | "servicios"
  | "nomina"
  | "inventario"
  | "marketing"
  | "equipamiento"
  | "transporte"
  | "impuestos"
  | "otros";

export interface ExpenseDocument extends Document {
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: Date;
  store?: mongoose.Types.ObjectId; // optional: tied to a branch
  receiptUrl?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExpenseSchema = new Schema<ExpenseDocument>(
  {
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: [
        "renta",
        "servicios",
        "nomina",
        "inventario",
        "marketing",
        "equipamiento",
        "transporte",
        "impuestos",
        "otros",
      ],
      required: true,
    },
    description: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    store: { type: Schema.Types.ObjectId, ref: "Store" },
    receiptUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose?.models?.Expense ||
  mongoose.model<ExpenseDocument>("Expense", ExpenseSchema);
