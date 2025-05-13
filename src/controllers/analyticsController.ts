import User from '../models/User';
import PendingUser from '../models/LGUPendingUser';
import GoogleUser from '../models/GoogleUser';
import ReportForm from '../models/ReportForm';
import { NextFunction, Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import Complaint from '../models/Complaint';
import Event from '../models/Event';
import Appointment from '../models/Appointment';
import moment from 'moment';

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


const predictNextPeriod = (historicalData: number[]) => {
  const currentMonth = new Date().getMonth(); 
  const validData = historicalData.slice(0, currentMonth + 1);

  if (validData.every(v => v === 0)) return 0;

  const n = validData.length;
  const xSum = validData.reduce((sum, _, idx) => sum + idx, 0);
  const ySum = validData.reduce((sum, val) => sum + val, 0);
  const xySum = validData.reduce((sum, val, idx) => sum + (idx * val), 0);
  const xSquaredSum = validData.reduce((sum, _, idx) => sum + (idx * idx), 0);

  const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;

  return Math.max(0, Math.round(intercept + slope * n));
};




interface StatusCount {
  _id: string;
  count: number;
}

interface MonthlySubmission {
  _id: number; // month number (1-12)
  count: number;
}

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Real-time data aggregations
    const [submissions, complaints, events, forms, activeUsers, peakActivityDays] = await Promise.all([
      ResponseCitizen.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]) as Promise<StatusCount[]>,
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]) as Promise<StatusCount[]>,
      Event.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]) as Promise<StatusCount[]>,
      // Total forms count (modified)
      ReportForm.aggregate([
        { $count: "count" }
      ]) as Promise<{ count: number }[]>,
      // Active users (last 30 days)
      User.aggregate([
        {
          $match: {
            lastActivity: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        { $count: "count" }
      ]) as Promise<{ count: number }[]>,
      // Peak activity by day of week
      ResponseCitizen.aggregate([
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Department performance (top 3 barangays)
    const departmentPerformance = await ResponseCitizen.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user.barangay",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    // All barangays for view all
    const allBarangays = await ResponseCitizen.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user.barangay",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const monthlySubmissions = await ResponseCitizen.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lte: new Date()
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const submissionHistory = Array(12).fill(0);
    monthlySubmissions.forEach((month: MonthlySubmission) => {
      submissionHistory[month._id - 1] = month.count;
    });

    const submissionPrediction = predictNextPeriod(submissionHistory);

    const totalSubmissions = submissions.reduce((acc, curr) => acc + curr.count, 0);
    const peakActivity = Array(7).fill(0).map((_, i) => ({
      day: new Date(0, 0, i).toLocaleDateString('en-US', { weekday: 'long' }),
      percentage: 0
    }));

    peakActivityDays.forEach(day => {
      const index = (day._id - 2 + 7) % 7; 
      peakActivity[index].percentage = Math.round((day.count / totalSubmissions) * 100);
    });

    const totalBarangaySubmissions = allBarangays.reduce((sum, b) => sum + b.count, 0);
    const overallPerformance = allBarangays.length > 0 
      ? (totalBarangaySubmissions / allBarangays.length).toFixed(1)
      : 0;

    const stats = {
      overview: {
        totalSubmissions: submissions.reduce((acc, curr) => acc + curr.count, 0),
        totalComplaints: complaints.reduce((acc, curr) => acc + curr.count, 0),
        activeEvents: events.find(e => e._id === 'published')?.count || 0,
        totalForms: forms[0]?.count || 0,
        activeUsers: activeUsers[0]?.count || 0
      },
      statusDistribution: {
        submissions,
        complaints,
        events
      },
      predictions: {
        nextMonthSubmissions: submissionPrediction,
        resolutionRate: complaints.length > 0 
          ? (
              (complaints.find(c => c._id === 'Resolved')?.count || 0) / 
              complaints.reduce((a, c) => a + c.count, 0) * 100
            ).toFixed(1)
          : 0
      },
      trends: {
        submissionHistory
      },
      peakActivity,
      departmentPerformance: {
        top3: departmentPerformance.map(dp => ({
          barangay: dp._id,
          count: dp.count,
          percentage: Math.round((dp.count / totalBarangaySubmissions) * 100)
        })),
        allBarangays: allBarangays.map(b => ({
          barangay: b._id,
          count: b.count,
          percentage: Math.round((b.count / totalBarangaySubmissions) * 100)
        })),
        overallPerformance
      }
    };

    res.json(stats);
  } catch (err) {
    next(err);
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

interface BarangayActivity {
  barangay: string;
  submissionCount: number;
  lastActivity: Date;
}

export const getBarangayActivity = async (req: Request, res: Response) => {
  try {
    const activityData = await ResponseCitizen.aggregate([
      {
        $lookup: {
          from: User.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user.barangay',
          submissionCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' },
        },
      },
      {
        $project: {
          _id: 0,
          barangay: '$_id',
          submissionCount: 1,
          lastActivity: 1,
        },
      },
      { $sort: { submissionCount: -1 } }, // Changed to descending order
    ]);

    // Calculate summary statistics
    const totalSubmissions = activityData.reduce((sum, curr) => sum + curr.submissionCount, 0);
    const mostActive = activityData[0];
    const leastActive = activityData[activityData.length - 1];

    res.status(200).json({
      summary: {
        totalBarangays: activityData.length,
        totalSubmissions,
        mostActive,
        leastActive
      },
      details: activityData
    });
  } catch (error) {
    console.error('Error fetching barangay activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to determine activity level
function getActivityLevel(submissionCount: number): string {
  if (submissionCount === 0) return 'Inactive';
  if (submissionCount <= 5) return 'Low Activity';
  if (submissionCount <= 15) return 'Moderate';
  return 'Highly Active';
}
