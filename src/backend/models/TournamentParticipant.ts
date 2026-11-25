import mongoose, { Document, Schema } from "mongoose";

interface TournamentParticipantDocument extends Document {
  tournamentId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  participantName?: string;
  email: string;
  name?: string;
  status: "registered" | "active" | "withdrawn" | "disqualified";
  points: number;
  registrationDate: Date;
  confirmationEmailSent: boolean;
  confirmationEmailSentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const TournamentParticipantSchema = new Schema<TournamentParticipantDocument>(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    participantName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    name: {
      type: String,
    },
    status: {
      type: String,
      enum: ["registered", "active", "withdrawn", "disqualified"],
      default: "registered",
      index: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    registrationDate: {
      type: Date,
      default: () => new Date(),
    },
    confirmationEmailSent: {
      type: Boolean,
      default: false,
    },
    confirmationEmailSentAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Compound index to prevent duplicate registrations
// Use sparse index to allow null userId or customerId
TournamentParticipantSchema.index(
  { tournamentId: 1, email: 1 },
  { unique: true },
);

export default mongoose?.models?.TournamentParticipant ||
  mongoose.model<TournamentParticipantDocument>(
    "TournamentParticipant",
    TournamentParticipantSchema,
  );
