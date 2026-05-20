import mongoose from 'mongoose';

const PageSchema = new mongoose.Schema({
  index: {
    type: Number,
  },
  category: {
    type: String,
  },
  preTitle: {
    type: String,
  },
  mainTitle: {
    type: String,
    require: true,
  },
  subTitle: {
    type: String,
  },
  slug: {
    type: String,
    unique: true,
  },
  mainImage: {
    type: String,
    require: true,
  },
  summary: {
    type: String,
  },
  sections: [
    {
      boxes: [
        {
          index: {
            type: Number,
          },
          preTitle: {
            type: String,
          },
          title: {
            type: String,
          },
          subTitle: {
            type: String,
          },
          images: [
            {
              url: {
                type: String,
              },
            },
          ],
          paragraphs: [
            {
              text: {
                type: String,
              },
            },
          ],
          button: {
            type: String,
          },
        },
      ],
    },
  ],
  published: {
    type: Boolean,
    default: false,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

export default mongoose?.models?.Page || mongoose.model('Page', PageSchema);
