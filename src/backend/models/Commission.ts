import mongoose from 'mongoose';

const CommissionSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: 'Affiliate',
  },
  referralEventId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: 'ReferralEvent',
  },
  orderId: {
    type: String,
  },
  productInfo: [
    {
      productId: {
        type: String,
        require: true,
      },
      productName: {
        type: String,
      },
      productPrice: {
        type: Number,
        require: true,
      },
    },
  ],
  date: {
    type: Date,
  },
  amount: {
    type: Number,
    require: true,
  },
  transactionId: {
    type: String,
    require: true,
  },
  commissionType: {
    type: String,
    require: true,
  },
  commissionRate: {
    type: Number,
    require: true,
  },
});

export default mongoose?.models?.Commission ||
  mongoose.model('Commission', CommissionSchema);
