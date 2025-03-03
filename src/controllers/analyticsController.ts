import User from '../models/User';
import PendingUser from '../models/LGUPendingUser';
import GoogleUser from '../models/GoogleUser';
import ReportForm from '../models/ReportForm';
import { Request, Response } from 'express';

export const getUserStats = async (req : Request, res : Response) => {
  try {
    const googleUsers = await GoogleUser.countDocuments();
    const manualUsers = await User.countDocuments();
    const totalUsers = googleUsers + manualUsers;
    const lguUsers = await User.countDocuments({ role: 'lgu' });
    const pendingApprovals = await PendingUser.countDocuments({ status: 'pending' });
    
    const usersByBarangay = await User.aggregate([
      { $group: { _id: '$barangay', count: { $sum: 1 } } }
    ]);

    res.json({
      totalUsers,
      lguUsers,
      pendingApprovals,
      usersByBarangay
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFormStats = async (req : Request, res : Response) => {
  try {
    const totalForms = await ReportForm.countDocuments();
    const averageFields = await ReportForm.aggregate([
      { $project: { fieldCount: { $size: "$fields" } } },
      { $group: { _id: null, avg: { $avg: "$fieldCount" } } }
    ]);

    res.json({
      totalForms,
      averageFields: averageFields[0]?.avg || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRecentActivity = async (req : Request, res : Response) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password -__v');

    const recentForms = await ReportForm.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ recentUsers, recentForms });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};