import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      require: true,
    },
    city: {
      type: String,
      require: true,
    },
    province: {
      type: String,
      require: true,
    },
    zip_code: {
      type: String,
      require: true,
    },
    country: {
      type: String,
      require: true,
    },
    phone: {
      type: String,
      require: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose?.models?.Address ||
  mongoose.model("Address", AddressSchema);
