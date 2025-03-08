import Express, { Request, Response, NextFunction } from 'express';
import { createBlog, updateBlog, getAllBlogs, getBlogById, deleteBlog } from '../controllers/blogsController';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });


const router = Express.Router();

router.post('/create-blog',  upload.array('images'), createBlog);
  
router.put('/update/:id',  upload.array('images'), updateBlog);


router.get('/get-blogs', getAllBlogs);
router.get('/get-blogs/:id', getBlogById); 

router.put('/delete/:id',  deleteBlog);


export default router;

