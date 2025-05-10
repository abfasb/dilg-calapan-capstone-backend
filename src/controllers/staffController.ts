import { Request, Response } from 'express';
import User from '../models/User';
import ResponseCitizen from '../models/ResponseCitizen';

export const getStaff = async (req: Request, res: Response) : Promise<void> => {
  try {
    const staff = await User.find({ role: 'lgu' })
      .select('firstName lastName email role isActive position phoneNumber barangay lastActivity avatarUrl')
      .sort({ lastActivity: -1 })
      .lean();

    const now = new Date();
    const staffWithStatus = staff.map(member => ({
      ...member,
      isActive: now.getTime() - new Date(member.lastActivity).getTime() < 5 * 60 * 1000,
      lastActivity: member.lastActivity || member.updatedAt 
    }));

    res.json(staffWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};


export const getApprovalRates = async (req: Request, res: Response) : Promise<void> => {
  try {
    const approvalStats = await ResponseCitizen.aggregate([
      { $unwind: "$history" },
      { $match: { "history.newStatus": { $in: ["approved", "rejected"] } } },
      {
        $group: {
          _id: {
            lguId: "$history.lguId",
            status: "$history.newStatus"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.lguId",
          approved: {
            $sum: {
              $cond: { if: { $eq: ["$_id.status", "approved"] }, then: "$count", else: 0 }
            }
          },
          rejected: {
            $sum: {
              $cond: { if: { $eq: ["$_id.status", "rejected"] }, then: "$count", else: 0 }
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "lgu"
        }
      },
      { $unwind: "$lgu" },
      {
        $project: {
          lguId: "$_id",
          lguName: { $concat: ["$lgu.firstName", " ", "$lgu.lastName"] },
          barangay: "$lgu.barangay",
          approved: 1,
          rejected: 1,
          total: { $add: ["$approved", "$rejected"] },
          approvalRate: {
            $cond: {
              if: { $eq: [{ $add: ["$approved", "$rejected"] }, 0] },
              then: 0,
              else: {
                $multiply: [
                  { $divide: ["$approved", { $add: ["$approved", "$rejected"] }] },
                  100
                ]
              }
            }
          }
        }
      },
      { $sort: { approvalRate: -1 } }
    ]);

    res.json(approvalStats);
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
};

export const getApprovedCitizens = async (req: Request, res: Response) => {
  try {
    const approvedSubmissions = await ResponseCitizen.aggregate([
      { $unwind: "$history" },
      { $match: { "history.newStatus": "approved" } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "citizen"
        }
      },
      { $unwind: "$citizen" },
      {
        $lookup: {
          from: "users",
          localField: "history.lguId",
          foreignField: "_id",
          as: "lgu"
        }
      },
      { $unwind: "$lgu" },
      {
        $project: {
          referenceNumber: 1,
          createdAt: 1,
          citizen: {
            name: { $concat: ["$citizen.firstName", " ", "$citizen.lastName"] },
            email: "$citizen.email"
          },
          lgu: {
            name: { $concat: ["$lgu.firstName", " ", "$lgu.lastName"] },
            barangay: "$lgu.barangay"
          },
          approvedAt: "$history.timestamp"
        }
      },
      { $sort: { approvedAt: -1 } }
    ]);

    res.json(approvedSubmissions);
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
};