import { Request, Response } from 'express';
import CitizenNotification from '../models/CitizenNotification';

export const createNotification = async (
  userId: string,
  message: string,
  type: 'submission' | 'complaint' | 'appointment',
  referenceId: string
) => {
  await CitizenNotification.create({
    userId,
    message,
    type,
    referenceId,
  });
};

export const getUserNotifications = async (req: Request, res: Response) : Promise<void> => {
  try {
    const userId = req.params.userId;
    const notifications = await CitizenNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);
      
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { id } = req.params;
    await CitizenNotification.findByIdAndUpdate(id, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};