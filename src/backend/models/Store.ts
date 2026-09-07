import mongoose, { Document, Schema } from "mongoose";

export interface StoreDocument extends Document {
  name: string;
  slug: string;
  type: "fisica" | "bodega";
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  managedBy: mongoose.Types.ObjectId[];
  branchLegacyName?: string; // Maps to existing Order.branch string values
  createdAt?: Date;
  updatedAt?: Date;
}

const StoreSchema = new Schema<StoreDocument>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["fisica", "bodega"],
      default: "fisica",
    },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    phone: { type: String },
    email: { type: String },
    isActive: { type: Boolean, default: true },
    managedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // Legacy mapping: matches the string stored in Order.branch for historical data
    branchLegacyName: { type: String },
  },
  { timestamps: true },
);

export default mongoose?.models?.Store ||
  mongoose.model<StoreDocument>("Store", StoreSchema);
