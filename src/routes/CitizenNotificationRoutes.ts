import express from 'express';
import { getUserNotifications, markAsRead } from '../controllers/citizenNotificationController';

const router = express.Router();

router.get('/:userId', getUserNotifications);
router.patch('/:id/read', markAsRead);

export default router;