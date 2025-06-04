import { Request, Response } from 'express';
import Notification from '../models/Notification';

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ 
    userId: (req.user as { id: string }).id,
      read: false
    }).sort('-createdAt');
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNotification = async (
  userId: string,
  message: string,
  type: string,
  link: string
) => {
  const notification = new Notification({ userId, message, type, link });
  await notification.save();
  return notification;
};