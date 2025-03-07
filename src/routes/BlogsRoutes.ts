import Express, { Request, Response, NextFunction } from 'express';
import { createBlog, updateBlog } from '../controllers/blogsController';

const router = Express.Router();

router.post('/create-blog', createBlog);
  
router.put('/update/:id', updateBlog);

export default router;

