import Notification from '../models/Notification';
import { Request, Response } from 'express';
import User from '../models/User';

export const getNotifications = async (req: Request, res: Response) : Promise<void> => {
  try {
    const notifications = await Notification.find({ read: false })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) : Promise<void> => {
  try {
    await Notification.updateMany({}, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications' });
  }
};


export const updateFCMToken = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { userId, fcmToken } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
       res.status(404).json({ message: 'User not found' });
       return;
    }

    if (user.role !== 'citizen') {
       res.status(403).json({ message: 'FCM tokens are only stored for Citizens' });
       return;
    }

    user.fcmToken = fcmToken;
    await user.save();

    res.status(200).json({ message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Server error updating FCM token' });
  }
};