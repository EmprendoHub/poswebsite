import mongoose from 'mongoose';

const AffiliateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: 'User',
    },
    stripe_id: {
      type: String,
    },
    name: {
      type: String,
    },
    fullName: {
      type: String,
    },
    avatar: {
      type: String,
    },
    email: {
      type: String,
      require: true,
    },
    dateOfBirth: {
      type: Date,
      require: true,
    },
    address: {
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
    },
    contact: {
      phone: {
        type: String,
        require: true,
        unique: true,
      },
      website: {
        type: String,
      },
      socialMedia: {
        tiktok: {
          type: String,
        },
        facebook: {
          type: String,
        },
        instagram: {
          type: String,
        },
      },
    },
    balance: {
      type: Number,
    },
    joinedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
    },
    settings: {
      notificationPreferences: {
        email: {
          type: Boolean,
        },
        sms: {
          type: Boolean,
        },
      },
    },
  },
  { timestamps: true }
);

export default mongoose?.models?.Affiliate ||
  mongoose.model('Affiliate', AffiliateSchema);
