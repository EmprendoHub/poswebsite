import mongoose, { Document, Model, Schema } from "mongoose";

interface OrderDocument extends Document {
  orderId?: number;
  affiliateId?: string;
  layaway?: boolean;
  layaway_amount?: number;
  ship_cost?: number;
  orderItems: Array<{
    product: mongoose.Types.ObjectId;
    variation: string;
    name: string;
    color?: string;
    size?: string;
    quantity: number;
    price: number;
    image: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  }>;
  paymentInfo: {
    id: string;
    status: string;
    taxPaid: number;
    amountPaid: number;
    paymentIntent?: string;
  };
  orderStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
  branch?: string;
  email?: string;
  phone?: string;
  customerName?: string;
  comment?: string;
  shippingInfo?: any; // Can be ObjectId reference or embedded object
  trackingNumber?: string;
  labelUrl?: string;
  shippingCarrier?: string;
  shippingService?: string;
  estimatedDelivery?: string;
  user?: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
}

const OrderSchema = new Schema<OrderDocument>({
  orderId: {
    type: Number, // This will store the unique incremental order number
  },
  affiliateId: {
    type: String,
  },
  layaway: {
    type: Boolean,
  },
  layaway_amount: {
    type: Number,
  },
  ship_cost: {
    type: Number,
  },
  orderItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        require: true,
        ref: "Product",
      },
      variation: {
        type: String,
        require: true,
      },
      name: {
        type: String,
        require: true,
      },
      color: {
        type: String,
      },
      size: {
        type: String,
      },
      quantity: {
        type: Number,
        require: true,
      },
      price: {
        type: Number,
        require: true,
      },
      image: {
        type: String,
        require: true,
      },
      weight: {
        type: Number,
      },
      length: {
        type: Number,
      },
      width: {
        type: Number,
      },
      height: {
        type: Number,
      },
    },
  ],
  paymentInfo: {
    id: {
      type: String,
      require: true,
    },
    status: {
      type: String,
      require: true,
    },
    taxPaid: {
      type: Number,
      require: true,
    },
    amountPaid: {
      type: Number,
      require: true,
    },
    paymentIntent: {
      type: String,
    },
  },
  orderStatus: {
    type: String,
    default: "Procesando",
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
  branch: {
    type: String,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  customerName: {
    type: String,
  },
  comment: {
    type: String,
  },
  shippingInfo: {
    type: Schema.Types.Mixed, // Allows both ObjectId and embedded object
  },
  trackingNumber: {
    type: String,
  },
  labelUrl: {
    type: String,
  },
  shippingCarrier: {
    type: String,
  },
  shippingService: {
    type: String,
  },
  estimatedDelivery: {
    type: String,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  customer: {
    type: Schema.Types.ObjectId,
    require: true,
    ref: "Customer",
  },
});

// Add indexes for user.phone and user.email
OrderSchema.index({ "user.phone": 1 });
OrderSchema.index({ "user.email": 1 });
OrderSchema.index({ "user.name": 1 });

// Apply the pre-save hook to generate the orderNumber
OrderSchema.pre<OrderDocument>("save", async function (next) {
  const doc = this;

  // Explicitly type `this.constructor` as `Model<OrderDocument>`
  const OrderModel = this.constructor as Model<OrderDocument>;

  if (!doc.orderId) {
    try {
      // Find the highest order number
      const highestOrder = await OrderModel.findOne(
        {},
        {},
        { sort: { orderId: -1 } },
      ).exec();

      // Calculate the next order number
      const nextOrderId = (highestOrder?.orderId || 10000) + 1;

      // Assign the next order number to the document
      doc.orderId = nextOrderId;
    } catch (error: any) {
      return next(error);
    }
  }

  next();
});

export default mongoose.models.Order ||
  mongoose.model<OrderDocument>("Order", OrderSchema);
