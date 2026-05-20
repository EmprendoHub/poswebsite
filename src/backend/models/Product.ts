import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    ASIN: { type: String },
    domain: { type: String },
    url: {
      type: String,
    },
    currency: {
      type: String,
    },
    images: [
      {
        url: {
          type: String,
        },
        color: {
          type: String,
        },
      },
    ],
    title: {
      require: true,
      type: String,
      unique: true,
    },
    details: [
      {
        key: { type: String },
        value: { type: String },
      },
    ],
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
    },
    currentPrice: { type: Number },
    originalPrice: { type: Number },
    discountRate: { type: Number },
    price: {
      require: true,
      type: Number,
    },
    sale_price: {
      type: Number,
    },
    sale_price_end_date: {
      type: Date,
    },
    cost: {
      type: Number,
    },
    reviewCount: { type: Number },
    stars: { type: Number },
    isOutOfStock: { type: Boolean, default: false },
    brand: {
      type: String,
    },
    linea: {
      type: String,
    },
    modelo: {
      type: String,
    },
    category: {
      require: true,
      type: String,
    },
    tags: [
      {
        value: {
          type: String,
        },
        label: {
          type: String,
        },
      },
    ],
    colors: [
      {
        value: {
          type: String,
        },
        label: {
          type: String,
        },
        hex: {
          type: String,
        },
      },
    ],
    sizes: [
      {
        value: {
          type: String,
        },
        label: {
          type: String,
        },
      },
    ],

    variations: [
      {
        title: {
          type: String,
        },
        stock: {
          type: Number,
        },
        color: {
          type: String,
        },
        colorHex: {
          type: String,
        },
        colorHexTwo: {
          type: String,
        },
        colorHexThree: {
          type: String,
        },
        size: {
          type: String,
        },
        cost: {
          type: Number,
        },
        price: {
          type: Number,
        },
        image: {
          type: String,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        productId: {
          type: String,
        },
      },
    ],
    gender: {
      type: String,
    },
    availability: {
      instagram: {
        type: Boolean,
        default: false,
      },
      branch: {
        type: Boolean,
        default: false,
      },
      online: {
        type: Boolean,
        default: true,
      },
    },
    stock: {
      require: true,
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },

    active: {
      default: true,
      type: Boolean,
    },
    createdAt: {
      type: Date,
    },
    published: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    weight: {
      type: Number,
      default: 0.5,
    },
    dimensions: {
      length: {
        type: Number,
        default: 15,
      },
      width: {
        type: Number,
        default: 15,
      },
      height: {
        type: Number,
        default: 10,
      },
    },
    reviews: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    default: [],
  },
  { timestamps: true }
);

export default mongoose?.models?.Product ||
  mongoose.model("Product", ProductSchema);
