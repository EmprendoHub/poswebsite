import mongoose, { Document, Schema } from "mongoose";

interface TournamentDocument extends Document {
  tournamentName: string;
  description?: string;
  ticketCost: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  startDate: Date;
  endDate: Date;
  winnerId?: mongoose.Types.ObjectId;
  winnerName?: string;
  winnerEmail?: string;
  totalParticipants: number;
  totalPool: number;
  winnerCredit: number;
  badges?: mongoose.Types.ObjectId[];
  coverImage?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const TournamentSchema = new Schema<TournamentDocument>(
  {
    tournamentName: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
    },
    ticketCost: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    winnerName: {
      type: String,
    },
    winnerEmail: {
      type: String,
    },
    totalParticipants: {
      type: Number,
      default: 0,
    },
    totalPool: {
      type: Number,
      default: 0,
    },
    winnerCredit: {
      type: Number,
      default: 0,
    },
    badges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TournamentBadge",
      },
    ],
    coverImage: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose?.models?.Tournament ||
  mongoose.model("Tournament", TournamentSchema);
