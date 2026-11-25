import mongoose, { Document, Schema } from "mongoose";

interface TournamentGalleryDocument extends Document {
  tournamentId: mongoose.Types.ObjectId;
  imageUrl: string;
  caption?: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  featured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const TournamentGallerySchema = new Schema<TournamentGalleryDocument>(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: () => new Date(),
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose?.models?.TournamentGallery ||
  mongoose.model("TournamentGallery", TournamentGallerySchema);
