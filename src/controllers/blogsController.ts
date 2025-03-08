import Express, { Request, Response } from 'express';
import BlogPost from '../models/landingpage/BlogPost';
import bucket from '../config/firebaseConfig';

export const createBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const uploadedImages: string[] = [];
    console.log('Received files:', req.files);

    const files = req.files;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'At least one image is required' });
      return;
    }

    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    for (const file of fileArray) {
      const fileName = `blog-images/${Date.now()}-${file.originalname}`;
      const fileRef = bucket.file(fileName);

      await new Promise((resolve, reject) => {
        const writeStream = fileRef.createWriteStream({
          metadata: { contentType: file.mimetype },
        });

        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.end(file.buffer);
      });

      const [url] = await fileRef.getSignedUrl({
        action: 'read',
        expires: new Date('2030-01-03').toISOString(),
      });

      uploadedImages.push(url);
    }

    const blog = new BlogPost({
      ...req.body,
      date: new Date(req.body.date),
      images: uploadedImages,
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Error creating blog post' });
  }
};

export const updateBlog = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { existingImages, ...restBody } = req.body;
    const uploadedImages: string[] = [];
    let parsedExistingImages: string[] = [];

    try {
      parsedExistingImages = existingImages ? JSON.parse(existingImages) : [];
    } catch (e) {
       res.status(400).json({ error: 'Invalid image data format' });
       return;
    }

    const files = req.files;

    if (files && typeof files === 'object' && "images" in files && Array.isArray(files["images"])) {
      for (const file of files["images"]) {
        const fileName = `blog-images/${Date.now()}-${file.originalname}`;
        const fileRef = bucket.file(fileName);

        await fileRef.save(file.buffer, {
          metadata: { contentType: file.mimetype },
        });

        const [url] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-01-2030',
        });

        uploadedImages.push(url);
      }
    }
    const combinedImages = [...parsedExistingImages, ...uploadedImages];
    if (combinedImages.length < 1) {
      res.status(400).json({ error: 'At least one image is required' });
      return;
    }
    if (combinedImages.length > 8) {
       res.status(400).json({ error: 'Maximum of 8 images allowed' });
       return;
    }

    const updatedBlog = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        ...restBody,
        date: new Date(restBody.date),
        images: combinedImages,
      },
      { new: true }
    );

    res.json(updatedBlog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Error updating blog post' });
  }
};

export const getAllBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const blogs = await BlogPost.find().sort({ date: -1 }); // Sort by latest
    res.status(200).json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Error fetching blog posts' });
  }
};

export const getBlogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await BlogPost.findById(req.params.id);

    if (!blog) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Error fetching blog post' });
  }
};

export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await BlogPost.findByIdAndDelete(req.params.id);
    if (!blog) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Error deleting blog post' });
  }
};