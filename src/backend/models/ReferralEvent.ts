import mongoose from 'mongoose';

const ReferralEventSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: 'Affiliate',
  },
  referralLinkId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: 'ReferralLink',
  },
  eventType: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
    require: true,
  },
  date: {
    type: Date,
  },
  location: {
    country: { type: String },
    region: { type: String },
    city: { type: String },
  },
  deviceInfo: {
    deviceType: { type: String },
    browser: { type: String },
  },
});

export default mongoose?.models?.ReferralEvent ||
  mongoose.model('ReferralEvent', ReferralEventSchema);
