import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    active: {
      default: false,
      type: Boolean,
    },
    name: {
      type: String,
      require: true,
      index: true,
    },
    email: {
      type: String,
      require: true,
      unique: true,
      index: true,
    },
    verificationToken: {
      type: String,
    },
    phone: {
      type: String,
      index: true,
    },
    stripe_id: {
      type: String,
    },
    mercado_token: {
      access_token: { type: String },
      token_type: { type: String },
      expires_in: { type: Number },
      scope: { type: String },
      user_id: { type: Number },
      refresh_token: { type: String },
      createdAt: { type: Date },
      updatedAt: { type: Date },
    },
    password: {
      type: String,
      require: true,
      select: false,
    },
    avatar: {
      type: String,
    },
    permissions: [
      {
        name: {
          type: String,
        },
        active: {
          default: false,
          type: Boolean,
        },
      },
    ],
    favorites: [
      {
        _id: {
          type: String,
        },
        title: {
          type: String,
        },
        price: {
          type: Number,
        },
        images: [
          {
            url: {
              type: String,
            },
          },
        ],
      },
    ],
    loginAttempts: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
    },
    role: {
      type: String,
      default: "cliente",
    },
    assignedStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    managerCode: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose?.models?.User || mongoose.model("User", UserSchema);
