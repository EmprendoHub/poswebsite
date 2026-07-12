import mongoose, { Document, Model, Schema } from "mongoose";

interface ProductDetailDocument extends Document {
  catType: "gender" | "brand" | "category";
  catTitle: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductDetailSchema = new Schema<ProductDetailDocument>(
  {
    catType: {
      type: String,
      enum: ["gender", "brand", "category"],
      required: true,
    },
    catTitle: {
      type: String,
      required: true,
      unique: true, // Global uniqueness across all catTypes
      index: true,
    },
  },
  { timestamps: true },
);

// Add compound index for queries
ProductDetailSchema.index({ catType: 1, catTitle: 1 });

const ProductDetail: Model<ProductDetailDocument> =
  mongoose.models.ProductDetail ||
  mongoose.model<ProductDetailDocument>("ProductDetail", ProductDetailSchema);

export default ProductDetail;
