import mongoose from 'mongoose';

const SubscriberSchema = new mongoose.Schema(
  {
    active: {
      default: false,
      type: Boolean,
    },
    email: {
      type: String,
      require: true,
      unique: true,
    },
    verificationToken: {
      type: String,
    },
    interest: [
      {
        name: {
          type: String,
        },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose?.models?.Subscriber ||
  mongoose.model('Subscriber', SubscriberSchema);
