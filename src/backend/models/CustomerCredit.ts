import mongoose, { Document, Schema } from "mongoose";

interface CreditTransactionDocument {
  type: "earned" | "used" | "adjusted" | "expired";
  amount: number;
  tournamentId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  description: string;
  transactionDate: Date;
  expiresAt?: Date;
  status?: "active" | "expired" | "refunded";
}

interface CustomerCreditDocument extends Document {
  userId: mongoose.Types.ObjectId;
  totalBalance: number;
  usedAmount: number;
  transactions: CreditTransactionDocument[];
  lastUpdated: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CreditTransactionSchema = new Schema<CreditTransactionDocument>(
  {
    type: {
      type: String,
      enum: ["earned", "used", "adjusted", "expired"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    description: {
      type: String,
      required: true,
    },
    transactionDate: {
      type: Date,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "expired", "refunded"],
      default: "active",
    },
  },
  { _id: true },
);

const CustomerCreditSchema = new Schema<CustomerCreditDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    totalBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: [CreditTransactionSchema],
    lastUpdated: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true },
);

export default mongoose?.models?.CustomerCredit ||
  mongoose.model("CustomerCredit", CustomerCreditSchema);
