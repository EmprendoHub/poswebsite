import mongoose, { Document, Schema } from "mongoose";

export interface PayrollEntryDocument extends Document {
  employee?: mongoose.Types.ObjectId; // ref: User — optional when using free-text name
  employeeName: string; // snapshot at time of payment
  periodStart: Date;
  periodEnd: Date;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netAmount: number; // baseSalary + bonuses - deductions
  store?: mongoose.Types.ObjectId;
  notes?: string;
  paidAt?: Date;
  isPaid: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const PayrollEntrySchema = new Schema<PayrollEntryDocument>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User" }, // optional
    employeeName: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    bonuses: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store" },
    notes: { type: String },
    paidAt: { type: Date },
    isPaid: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-calculate netAmount before save
PayrollEntrySchema.pre<PayrollEntryDocument>("save", function (next) {
  this.netAmount =
    this.baseSalary + (this.bonuses || 0) - (this.deductions || 0);
  next();
});

export default mongoose?.models?.PayrollEntry ||
  mongoose.model<PayrollEntryDocument>("PayrollEntry", PayrollEntrySchema);
