import mongoose, { Document, Schema } from "mongoose";

interface TournamentBadgeDocument extends Document {
  badgeName: string;
  description?: string;
  badgeImage: string;
  badgeColor?: string;
  tier: "gold" | "silver" | "bronze" | "special";
  createdAt?: Date;
  updatedAt?: Date;
}

const TournamentBadgeSchema = new Schema<TournamentBadgeDocument>(
  {
    badgeName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
    },
    badgeImage: {
      type: String,
      required: true,
    },
    badgeColor: {
      type: String,
    },
    tier: {
      type: String,
      enum: ["gold", "silver", "bronze", "special"],
      default: "bronze",
    },
  },
  { timestamps: true },
);

export default mongoose?.models?.TournamentBadge ||
  mongoose.model("TournamentBadge", TournamentBadgeSchema);
