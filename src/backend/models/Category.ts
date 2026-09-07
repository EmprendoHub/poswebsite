import mongoose, { Document, Model, Schema } from "mongoose";

export interface CategoryDocument extends Document {
  name: string;
  slug: string;
  kind: "main" | "sub" | "attribute";
  // Required for "sub" (points to its main category). Null for "main" and "attribute"
  // (attributes are kept global/reusable across main categories, e.g. "Tarjetas" applies
  // to both Anime and Deportes products).
  parent?: mongoose.Types.ObjectId | null;
  image?: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    kind: {
      type: String,
      enum: ["main", "sub", "attribute"],
      required: true,
    },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    image: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CategorySchema.index({ kind: 1, parent: 1, order: 1 });

const Category: Model<CategoryDocument> =
  mongoose.models.Category ||
  mongoose.model<CategoryDocument>("Category", CategorySchema);

export default Category;
