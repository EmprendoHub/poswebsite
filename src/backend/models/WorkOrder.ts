import mongoose, { Document, Model, Schema } from "mongoose";

export type WorkOrderType =
  | "transfer" // Move stock from one store to another
  | "receive" // Receive new stock into a store (no source store)
  | "adjustment" // Manual stock correction with reason
  | "new_product"; // Add a brand-new product to a store

export type WorkOrderStatus =
  | "draft"
  | "pending"
  | "approved"
  | "in_transit"
  | "completed"
  | "cancelled";

export interface WorkOrderItem {
  product: mongoose.Types.ObjectId;
  productTitle: string;
  variationId: string;
  variationTitle?: string;
  sku?: string;
  quantity: number;
  unitCost?: number;
  notes?: string;
  // For new_product orders only
  isNewProduct?: boolean;
  newProductData?: Record<string, any>;
}

export interface WorkOrderDocument extends Document {
  workOrderNumber: number;
  type: WorkOrderType;
  fromStore?: mongoose.Types.ObjectId; // null for receive / new_product
  toStore: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  status: WorkOrderStatus;
  items: WorkOrderItem[];
  notes?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkOrderSchema = new Schema<WorkOrderDocument>(
  {
    workOrderNumber: { type: Number },
    type: {
      type: String,
      enum: ["transfer", "receive", "adjustment", "new_product"],
      required: true,
    },
    fromStore: { type: Schema.Types.ObjectId, ref: "Store" },
    toStore: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "in_transit",
        "completed",
        "cancelled",
      ],
      default: "draft",
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productTitle: { type: String, required: true },
        variationId: { type: String, required: true },
        variationTitle: { type: String },
        sku: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number },
        notes: { type: String },
        isNewProduct: { type: Boolean, default: false },
        newProductData: { type: Schema.Types.Mixed },
      },
    ],
    notes: { type: String },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true },
);

// Auto-increment work order number
WorkOrderSchema.pre<WorkOrderDocument>("save", async function (next) {
  if (!this.workOrderNumber) {
    const WorkOrderModel = this.constructor as Model<WorkOrderDocument>;
    try {
      const highest = await WorkOrderModel.findOne(
        {},
        {},
        { sort: { workOrderNumber: -1 } },
      ).exec();
      this.workOrderNumber = (highest?.workOrderNumber || 1000) + 1;
    } catch (err: any) {
      return next(err);
    }
  }
  next();
});

export default mongoose?.models?.WorkOrder ||
  mongoose.model<WorkOrderDocument>("WorkOrder", WorkOrderSchema);
