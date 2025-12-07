import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LGUNotication from '../models/LGUNotication';

export const getUserNotifications = async (req: Request, res: Response) : Promise<void> => {
  try {
    const userId = req.params.userId;
    const notifications = await LGUNotication.find()
      .sort({ createdAt: -1 })
      .populate('referenceId');
    
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

export const markAsRead = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await LGUNotication.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
       res.status(404).json({ message: 'Notification not found' });
       return;
    }
    
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
};

export const markAllAsRead = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { userId } = req.params;
    await LGUNotication.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error });
  }
};

export const deleteNotification = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await LGUNotication.findByIdAndDelete(id);
    
    if (!notification) {
       res.status(404).json({ message: 'Notification not found' });
       return;
    }
    
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error });
  }
};

export const clearAllNotifications = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { userId } = req.params;
    await LGUNotication.deleteMany({ userId });
    
    res.status(200).json({ message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing notifications', error });
  }
};