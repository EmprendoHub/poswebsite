import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  type: {
    type: String,
    require: true,
  },
  amount: {
    require: true,
    type: Number,
  },
  reference: {
    type: String,
  },
  paymentIntent: {
    type: String,
  },
  method: {
    type: String,
  },
  comment: {
    type: String,
  },
  pay_date: {
    type: Date,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: 'Order',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
});

export default mongoose?.models?.Payment ||
  mongoose.model('Payment', PaymentSchema);
