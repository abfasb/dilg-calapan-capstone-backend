import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlogPost extends Document {
  title: string;
  content: string;
  date: Date;
  status: 'draft' | 'published';
  images: string[];
}

const blogPostSchema: Schema<IBlogPost> = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    required: true,
    default: 'draft',
  },
  images: {
    type: [String],
    validate: {
      validator: (arr: string[]) => arr.length <= 8,
      message: 'Maximum of 8 images allowed',
    },
  },
});

export default mongoose.model<IBlogPost>('BlogPost', blogPostSchema);

