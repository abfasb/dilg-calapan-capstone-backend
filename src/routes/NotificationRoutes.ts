import express from 'express';
import admin from 'firebase-admin';
import User from '../models/User';
import GoogleUser from '../models/GoogleUser';
import { getNotifications, markAsRead, updateFCMToken } from '../controllers/notificationController';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    const user = await User.findById(userId) || await GoogleUser.findById(userId);
    
    if (user?.fcmToken) {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: 'Report Status Update',
          body: message
        }
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});


router.get('/admin', getNotifications);
router.put('/mark-read', markAsRead);
router.put('/save-fcm-token', updateFCMToken);


export default router;