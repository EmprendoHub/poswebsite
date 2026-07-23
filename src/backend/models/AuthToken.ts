import mongoose, { Schema, Document } from "mongoose";

export interface IAuthToken extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  token: string;
  productId: mongoose.Schema.Types.ObjectId;
  variationId: mongoose.Schema.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  usedAt?: Date;
}

const AuthTokenSchema = new Schema<IAuthToken>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-delete expired tokens
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthToken =
  mongoose.models.AuthToken ||
  mongoose.model<IAuthToken>("AuthToken", AuthTokenSchema);

export default AuthToken;
