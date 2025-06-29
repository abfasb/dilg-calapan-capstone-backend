import Express, { Request, Response, NextFunction } from 'express';
import { createBlog, updateBlog, getAllBlogs, getBlogById, deleteBlog } from '../controllers/blogsController';
import { clearAllNotifications, deleteNotification, getUserNotifications, markAllAsRead, markAsRead } from '../controllers/lguNotificationController';

const router = Express.Router();

router.get('/', getUserNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/:userId/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/:userId/clear-all', clearAllNotifications);

export default router;

