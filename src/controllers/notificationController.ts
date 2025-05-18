import Notification from '../models/Notification';
import { Request, Response } from 'express';

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