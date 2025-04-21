import { Request, Response } from 'express';
import User from '../models/User';

export const getStaff = async (req: Request, res: Response) => {
  try {
    const staff = await User.find({ role: 'lgu' })
      .select('firstName lastName email role position phoneNumber barangay lastActivity avatarUrl')
      .sort({ lastActivity: -1 })
      .lean();

    const now = new Date();
    const staffWithStatus = staff.map(member => ({
      ...member,
      isActive: now.getTime() - new Date(member.lastActivity).getTime() < 5 * 60 * 1000 
    }));

    res.json(staffWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};