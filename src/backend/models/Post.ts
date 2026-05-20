import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  category: {
    type: String,
    require: true,
  },
  mainTitle: {
    type: String,
    require: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  mainImage: {
    type: String,
    require: true,
  },
  metaTitle: {
    type: String,
  },
  summary: {
    type: String,
  },
  sectionTwoTitle: {
    type: String,
  },
  sectionTwoParagraphOne: {
    type: String,
  },
  sectionTwoParagraphTwo: {
    type: String,
  },
  sectionThreeTitle: {
    type: String,
  },
  sectionThreeParagraphOne: {
    type: String,
  },
  sectionThreeImage: {
    type: String,
  },
  sectionThreeParagraphFooter: {
    type: String,
  },
  sectionFourTitle: {
    type: String,
  },
  sectionFourImage: {
    type: String,
  },
  sectionFourParagraphOne: {
    type: String,
  },
  sectionFourParagraphTwo: {
    type: String,
  },
  published: {
    type: Boolean,
    default: false,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

export default mongoose?.models?.Post || mongoose.model("Post", PostSchema);
