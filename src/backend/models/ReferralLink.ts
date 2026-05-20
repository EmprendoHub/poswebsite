import mongoose from 'mongoose';

const ReferralLinkSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: 'Affiliate',
  },
  uniqueCode: {
    type: String,
  },
  clickCount: {
    type: Number,
  },
  userAgent: {
    type: String,
    require: true,
  },
  createdAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  isExpired: {
    type: Boolean,
  },
  targetUrl: {
    type: String,
  },
  metadata: {
    campaign: { type: String },
    source: { type: String }, // Source of the referral link (e.g., social media, email)
    medium: { type: String }, // Medium used (e.g., banner, email, text link)
  },
});

export default mongoose?.models?.ReferralLink ||
  mongoose.model('ReferralLink', ReferralLinkSchema);
