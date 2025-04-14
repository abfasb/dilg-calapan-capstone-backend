import { NextFunction, Request, Response } from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import Appointment from '../models/Appointment';
import ResponseCitizen from '../models/ResponseCitizen';
import { calculateSatisfactionScore } from '../../utils/analytics';
import ReportForms from '../models/ReportForm';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const [
      complaints,
      users,
      appointments,
      responses,
      categories,
      recentActivities
    ] = await Promise.all([
      ResponseCitizen.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            resolved: [{ $match: { status: "approved" } }, { $count: "count" }]
          }
        }
      ]),
      
      User.aggregate([
        { $match: { role: 'citizen' } },
        { $count: "count" }
      ]),
      
      Appointment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      
      ResponseCitizen.aggregate([
        { 
          $group: { 
            _id: { $cond: [{ $ne: ["$bulkFile", null] }, "file", "form"] },
            count: { $sum: 1 }
          } 
        }
      ]),
      
      Complaint.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { category: "$_id", count: 1, _id: 0 } }
      ]),
      
      Complaint.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        { $project: { 
            title: 1,
            description: 1,
            type: "complaint",
            timestamp: "$createdAt",
            status: 1
          } 
        }
      ])
    ]);

    const totalReports = complaints[0]?.total[0]?.count || 0;
    const resolvedCases = complaints[0]?.resolved[0]?.count || 0;
    const avgResolution = await calculateAvgResolutionTime();
    
    const result = {
      totalReports,
      resolvedCases,
      registeredUsers: users[0]?.count || 0,
      avgResolutionTime: avgResolution,
      activeUsers: await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      satisfaction: await calculateSatisfactionScore(),
      userGrowth: await getUserGrowthData(),
      appointmentStatus: appointments.reduce((acc, curr) => ({
        ...acc,
        [curr._id]: curr.count
      }), {}),
      responseTypes: responses.reduce((acc, curr) => ({
        ...acc,
        [curr._id]: curr.count
      }), {}),
      categoryDistribution: categories,
      recentActivities: recentActivities
    };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const calculateAvgResolutionTime = async () => {
  const result = await Complaint.aggregate([
    { $match: { status: "resolved" } },
    {
      $group: {
        _id: null,
        avgDays: { $avg: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 1000 * 60 * 60 * 24] } }
      }
    }
  ]);
  return result[0]?.avgDays ? Math.round(result[0].avgDays) : 0;
};

const getUserGrowthData = async () => {
  return User.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { month: "$_id", count: 1, _id: 0 } }
  ]);
};

export const getReports = async (req: Request, res: Response, next : NextFunction) : Promise<void> => {
  try {
    const reports = await ReportForms.find()
    res.json(reports)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

export const getApprovedResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { formId } = req.query;
    const user = await User.findById((req.user as { id: string })?.id);

    const responses = await ResponseCitizen.find({
      formId,
      status: 'approved',
      'user.barangay': user?.barangay
    })
    .populate<{ userId: { firstName: string; lastName: string; barangay: string } }>('userId', 'firstName lastName barangay')
    .lean(); 

    const formattedResponses = responses.map(response => {
      const formData = Object.entries(response.data || {}).reduce((acc, [key, value]) => {
        if (!['userId', 'submissionType'].includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      return {
        ...response,
        files: response.files.map(file => ({
          filename: file.filename,
          url: file.url,
          mimetype: file.mimetype
        })),    
        data: formData,
        user: {
          firstName: response.userId?.firstName,
          lastName: response.userId?.lastName,
          barangay: response.userId?.barangay
        }
      };
    });

    res.json(formattedResponses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};