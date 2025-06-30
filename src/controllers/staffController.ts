import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import ResponseCitizen from '../models/ResponseCitizen';
import StatusHistory from '../models/StatusHistory';

export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await User.find({ role: 'lgu' })
      .select('firstName lastName email role isActive position phoneNumber barangay lastActivity avatarUrl')
      .sort({ lastActivity: -1 })
      .lean();

    const now = new Date();
    const staffWithStatus = staff.map(member => {
      const lastActivity = member.lastActivity || member.updatedAt;
       const isActive = now.getTime() - new Date(lastActivity).getTime() < 20 * 60 * 1000;

      
      return {
        ...member,
        isActive,
        lastActivity
      };
    });

    res.json(staffWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getApprovalRates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const aggregatedData = await StatusHistory.aggregate([
      {
        $match: {
          newStatus: { $in: ['approved', 'rejected'] },
          lguId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$lguId',
          totalHandled: { $sum: 1 },
          approvedHandled: {
            $sum: {
              $cond: [{ $eq: ['$newStatus', 'approved'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const lguUsers = await User.find({ role: 'lgu' }).lean();

    const statsMap = new Map<string, { totalHandled: number; approvedHandled: number }>();
    aggregatedData.forEach(stat => {
      statsMap.set(stat._id.toString(), {
        totalHandled: stat.totalHandled,
        approvedHandled: stat.approvedHandled 
      });
    });

    const response = lguUsers.map(lgu => {
      const lguIdStr = lgu._id.toString();
      const stats = statsMap.get(lguIdStr) || { totalHandled: 0, approvedHandled: 0 };
      
      const approvalRate = stats.totalHandled === 0 
      ? 0 
      : Number(((stats.approvedHandled / stats.totalHandled) * 100).toFixed(2));


      return {
        lguId: lguIdStr,
        lguName: `${lgu.firstName} ${lgu.lastName}`,
        approved: stats.approvedHandled,
        rejected: stats.totalHandled - stats.approvedHandled, 
        approvalRate: approvalRate
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('Error in getApprovalRates:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const getApprovedCitizens = async (req: Request, res: Response, next : NextFunction): Promise<void> => {
  try {
    const approvedSubmissions = await ResponseCitizen.find({ status: 'approved' })
      .populate('userId', 'firstName lastName email barangay') 
      .populate('formId', 'title') 
      .populate('history.lguId', 'firstName lastName');

    res.status(200).json({ success: true, data: approvedSubmissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};