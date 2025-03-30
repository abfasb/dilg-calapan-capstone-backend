import User from '../models/User';
import PendingUser from '../models/LGUPendingUser';
import GoogleUser from '../models/GoogleUser';
import ReportForm from '../models/ReportForm';
import { NextFunction, Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import Complaint from '../models/Complaint';
import Event from '../models/Event';
import Appointment from '../models/Appointment';

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


export const getResponseStats = async (req: Request, res: Response) => {
  try {
    const totalResponses = await ResponseCitizen.countDocuments();
    const responsesByStatus = await ResponseCitizen.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const averageResponseTime = await ResponseCitizen.aggregate([
      { 
        $project: { 
          processingTime: { 
            $divide: [
              { $subtract: [new Date(), "$createdAt"] }, 
              1000 * 60 * 60 * 24 // Convert to days
            ] 
          } 
        } 
      },
      { $group: { _id: null, avg: { $avg: "$processingTime" } } }
    ]);

    const documentsStats = await ResponseCitizen.aggregate([
      { $project: { filesCount: { $size: "$files" } } },
      { $group: { 
        _id: null,
        totalFiles: { $sum: "$filesCount" },
        avgFilesPerResponse: { $avg: "$filesCount" }
      } }
    ]);

    res.json({
      totalResponses,
      responsesByStatus,
      averageProcessingTime: averageResponseTime[0]?.avg || 0,
      totalDocuments: documentsStats[0]?.totalFiles || 0,
      avgDocumentsPerResponse: documentsStats[0]?.avgFilesPerResponse || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFormResponses = async (req: Request, res: Response) => {
  try {
    const responsesPerForm = await ResponseCitizen.aggregate([
      { $group: { _id: "$formId", count: { $sum: 1 } } },
      { $lookup: {
        from: "reportforms",
        localField: "_id",
        foreignField: "_id",
        as: "form"
      }},
      { $unwind: "$form" },
      { $project: { formTitle: "$form.title", count: 1 } }
    ]);

    const sectorDistribution = await ResponseCitizen.aggregate([
      { $unwind: "$data" },
      { $match: { "data.key": "4141b9cf-fbe0-4001-a249-b2f7adf93e6f" } },
      { $group: { _id: "$data.value", count: { $sum: 1 } } }
    ]);

    res.json({ responsesPerForm, sectorDistribution });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSubmissionTrends = async (req: Request, res: Response) => {
  try {
    const trends = await ResponseCitizen.aggregate([
      { 
        $project: { 
          week: { $week: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" }
        } 
      },
      { 
        $group: {
          _id: { year: "$year", month: "$month", week: "$week" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 } },
      { $limit: 12 }
    ]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};




export const getLGUStats = async (req: any, res: Response, next: NextFunction) => {
  try {
    const barangay = req.user.barangay;
    
    const [
      totalCitizens,
      pendingComplaints,
      resolvedComplaints,
      totalResponses,
      avgResponseTime,
      upcomingEvents
    ] = await Promise.all([
      User.countDocuments({ role: 'citizen', barangay }),
      Complaint.countDocuments({ status: 'pending', barangay }),
      Complaint.countDocuments({ status: 'resolved', barangay }),
      ResponseCitizen.countDocuments({ barangay }),
      ResponseCitizen.aggregate([
        { $match: { barangay, status: 'resolved' } },
        { $group: { _id: null, avg: { $avg: "$resolutionTime" } } }
      ]),
      Event.countDocuments({ status: 'published', barangay })
    ]);

    const totalCases = pendingComplaints + resolvedComplaints;
    const resolutionRate = totalCases > 0 
      ? (resolvedComplaints / totalCases) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalCitizens,
        totalReports: totalResponses + totalCases,
        resolutionRate: Number(resolutionRate.toFixed(1)),
        avgResponseTime: avgResponseTime[0]?.avg 
          ? Number((avgResponseTime[0].avg / 86400000).toFixed(1)) 
          : 0,
        upcomingEvents
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTrendData = async (req: any, res: Response, next: NextFunction) => {
  try {
    const barangay = req.user.barangay;
    
    const [complaints, responses] = await Promise.all([
      Complaint.aggregate([
        { $match: { barangay } },
        { 
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ]),
      ResponseCitizen.aggregate([
        { $match: { barangay } },
        { 
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        complaints: complaints.map(c => ({ month: c._id, ...c })),
        responses: responses.map(r => ({ month: r._id, ...r }))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivities = async (req: any, res: Response, next: NextFunction) => {
  try {
    const barangay = req.user.barangay;
    
    const [complaints, responses] = await Promise.all([
      Complaint.find({ barangay })
        .sort('-createdAt')
        .limit(5)
        .lean(),
      ResponseCitizen.find({ barangay })
        .sort('-createdAt')
        .limit(5)
        .lean()
    ]);

    const activities = [...complaints, ...responses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map(item => ({
        ...item,
        type: 'title' in item ? 'complaint' : 'response'
      }));

    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};


export const getDashboardStats = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const [
      totalReports,
      resolvedReports,
      complaintsByCategory,
      appointmentStats,
      responseTimes,
      userStats
    ] = await Promise.all([
      ResponseCitizen.aggregate([
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      ResponseCitizen.aggregate([
        { $match: { status: 'resolved' } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ResponseCitizen.aggregate([
        { $match: { status: 'resolved' } },
        { 
          $project: {
            days: { 
              $ceil: { 
                $divide: [
                  { $subtract: ['$updatedAt', '$createdAt'] }, 
                  1000 * 60 * 60 * 24
                ] 
              } 
            } 
          } 
        },
        { $group: { _id: null, avg: { $avg: '$days' } } }
      ]),
      User.aggregate([
        { $match: { role: 'citizen' } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ])
    ]);

    const stats = {
      totalReports: totalReports[0]?.count || 0,
      resolutionRate: ((resolvedReports[0]?.count || 0) / (totalReports[0]?.count || 1)) * 100, 
      avgResponseTime: responseTimes.length > 0 ? responseTimes[0]?.avg || 0 : 0, 
      activeUsers: userStats[0]?.count || 0,
      complaintsByCategory: complaintsByCategory.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      appointmentStats: appointmentStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
    

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReportTrends = async (req : Request, res : Response, next : NextFunction) : Promise<void> => {
  try {
    const trends = await ResponseCitizen.aggregate([
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          month: '$_id',
          total: 1,
          resolved: 1,
          pending: { $subtract: ['$total', '$resolved'] }
        }
      },
      { $sort: { month: 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formatted = trends.map(t => ({
      name: monthNames[t.month - 1],
      reports: t.total,
      resolved: t.resolved,
      pending: t.pending
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};