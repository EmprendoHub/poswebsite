import mongoose from "mongoose";

const PriceTrackerSchema = new mongoose.Schema(
  {
    // Product reference
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productTitle: {
      type: String,
      required: true,
    },

    // Price information
    price: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
      enum: ["precio inicial", "actualización de precio", "ajuste de precio"],
      required: true,
    },

    // Product details at time of change
    category: {
      type: String,
    },
    brand: {
      type: String,
    },

    // User who made the change
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
    },
    userRole: {
      type: String,
    },

    // Authorization
    authorizedBy: {
      type: String,
    },
    authorizedUserId: {
      type: String,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for faster queries
PriceTrackerSchema.index({ productId: 1, createdAt: -1 });
PriceTrackerSchema.index({ createdAt: -1 });

// Delete the model from cache if it exists to ensure schema updates are applied
if (mongoose.models.PriceTracker) {
  delete mongoose.models.PriceTracker;
}

export default mongoose.model("PriceTracker", PriceTrackerSchema);
