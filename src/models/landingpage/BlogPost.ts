import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
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
    validate: [(arr : any) => arr.length <= 8, 'Maximum of 8 images allowed'],
  },
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

export default BlogPost;
