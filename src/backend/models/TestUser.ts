import mongoose from "mongoose";

const TestUserSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
    },
    id: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    nickname: {
      type: String,
    },
    site_status: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose?.models?.TestUser ||
  mongoose.model("TestUser", TestUserSchema);
