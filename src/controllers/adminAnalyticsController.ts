import { NextFunction, Request, Response } from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import Appointment from '../models/Appointment';
import ResponseCitizen from '../models/ResponseCitizen';
import ReportForms from '../models/ReportForm';
import { subWeeks, subYears, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';

interface DateRange {
  start: Date;
  end: Date;
}
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Get date ranges for analytics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Parallel execution of all analytics queries
    const [
      // User Analytics
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      usersByRole,
      usersByBarangay,
      userRegistrationTrend,
      
      // Complaint Analytics
      totalComplaints,
      complaintsByStatus,
      complaintsByCategory,
      complaintsTrend,
      avgResolutionTime,
      
      // Appointment Analytics
      totalAppointments,
      appointmentsByStatus,
      appointmentsTrend,
      upcomingAppointments,
      
      // Form Submission Analytics
      totalSubmissions,
      submissionsByStatus,
      submissionsTrend,
      pendingSubmissions,
      
      // Recent Activities
      recentComplaints,
      recentAppointments,
      recentSubmissions
    ] = await Promise.all([
      // User Analytics Queries
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.aggregate([
        { $match: { barangay: { $nin: [null, ''] } } },
        { $group: { _id: '$barangay', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),

      // Complaint Analytics Queries
      Complaint.countDocuments(),
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      Complaint.aggregate([
        {
          $match: {
            status: 'Resolved',
            createdAt: { $exists: true },
            updatedAt: { $exists: true }
          }
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$updatedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: { $avg: '$resolutionTime' }
          }
        }
      ]),

      // Appointment Analytics Queries
      Appointment.countDocuments(),
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Appointment.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      Appointment.countDocuments({
        date: { $gte: now },
        status: { $ne: 'cancelled' }
      }),

      // Form Submission Analytics Queries
      ResponseCitizen.countDocuments(),
      ResponseCitizen.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ResponseCitizen.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      ResponseCitizen.countDocuments({ status: 'pending' }),

      // Recent Activities
      Complaint.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status category createdAt location'),
      Appointment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'firstName lastName')
        .select('title status date time createdAt'),
      ResponseCitizen.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'firstName lastName')
        .populate('formId', 'title')
        .select('referenceNumber status createdAt')
    ]);

    // Calculate growth rates
    const calculateGrowthRate = async (model: any, timeframe: Date) => {
      const current = await model.countDocuments({ createdAt: { $gte: timeframe } });
      const previous = await model.countDocuments({
        createdAt: {
          $gte: new Date(timeframe.getTime() - (Date.now() - timeframe.getTime())),
          $lt: timeframe
        }
      });
      return previous > 0 ? ((current - previous) / previous) * 100 : 0;
    };

    const [userGrowth, complaintGrowth, appointmentGrowth, submissionGrowth] = await Promise.all([
      calculateGrowthRate(User, last30Days),
      calculateGrowthRate(Complaint, last30Days),
      calculateGrowthRate(Appointment, last30Days),
      calculateGrowthRate(ResponseCitizen, last30Days)
    ]);

    const systemMetrics = {
      complaintResolutionRate: totalComplaints > 0 
        ? ((complaintsByStatus.find(s => s._id === 'Resolved')?.count || 0) / totalComplaints) * 100 
        : 0,
      appointmentConfirmationRate: totalAppointments > 0 
        ? ((appointmentsByStatus.find(s => s._id === 'confirmed')?.count || 0) / totalAppointments) * 100 
        : 0,
      formApprovalRate: totalSubmissions > 0 
        ? ((submissionsByStatus.find(s => s._id === 'approved')?.count || 0) / totalSubmissions) * 100 
        : 0,
      avgResolutionTime: avgResolutionTime[0]?.avgResolutionTime || 0
    };

    // Format trend data for charts
    const formatTrendData = (data: any[], label: string) => {
      return data.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        [label]: item.count
      }));
    };

    const dashboardData = {
      overview: {
        totalUsers,
        activeUsers,
        totalComplaints,
        totalAppointments,
        totalSubmissions,
        pendingSubmissions,
        upcomingAppointments,
        newUsersThisMonth
      },
      growth: {
        userGrowth: Math.round(userGrowth * 100) / 100,
        complaintGrowth: Math.round(complaintGrowth * 100) / 100,
        appointmentGrowth: Math.round(appointmentGrowth * 100) / 100,
        submissionGrowth: Math.round(submissionGrowth * 100) / 100
      },
      charts: {
        userRegistrationTrend: formatTrendData(userRegistrationTrend, 'users'),
        complaintsTrend: formatTrendData(complaintsTrend, 'complaints'),
        appointmentsTrend: formatTrendData(appointmentsTrend, 'appointments'),
        submissionsTrend: formatTrendData(submissionsTrend, 'submissions'),
        usersByRole: usersByRole.map(item => ({
          role: item._id,
          count: item.count,
          percentage: Math.round((item.count / totalUsers) * 100)
        })),
        usersByBarangay: usersByBarangay.map(item => ({
          barangay: item._id,
          count: item.count
        })),
        complaintsByStatus: complaintsByStatus.map(item => ({
          status: item._id,
          count: item.count,
          percentage: Math.round((item.count / totalComplaints) * 100)
        })),
        complaintsByCategory: complaintsByCategory.map(item => ({
          category: item._id,
          count: item.count
        })),
        appointmentsByStatus: appointmentsByStatus.map(item => ({
          status: item._id,
          count: item.count,
          percentage: Math.round((item.count / totalAppointments) * 100)
        })),
        submissionsByStatus: submissionsByStatus.map(item => ({
          status: item._id,
          count: item.count,
          percentage: Math.round((item.count / totalSubmissions) * 100)
        }))
      },
      systemMetrics,
      recentActivities: {
        complaints: recentComplaints,
        appointments: recentAppointments,
        submissions: recentSubmissions
      },
      insights: {
        mostActiveBarangay: usersByBarangay[0]?.barangay || 'N/A',
        topComplaintCategory: complaintsByCategory[0]?._id || 'N/A',
        systemHealth: {
          status: systemMetrics.complaintResolutionRate > 80 ? 'Excellent' : 
                 systemMetrics.complaintResolutionRate > 60 ? 'Good' : 'Needs Improvement',
          score: Math.round((systemMetrics.complaintResolutionRate + 
                          systemMetrics.appointmentConfirmationRate + 
                          systemMetrics.formApprovalRate) / 3)
        }
      }
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper functions
const getDateRange = (period: string): DateRange => {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return {
        start: startOfDay(subWeeks(now, 1)),
        end: endOfDay(now)
      };
    case 'year':
      return {
        start: startOfDay(subYears(now, 1)),
        end: endOfDay(now)
      };
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'all':
    default:
      return {
        start: new Date(0), // All time
        end: now
      };
  }
};

const getPreviousDateRange = (period: string): DateRange => {
  const now = new Date();
  
  if (period === 'all') {
    return {
      start: new Date(0),
      end: new Date(0)
    };
  }
  
  switch (period) {
    case 'week':
      return {
        start: startOfDay(subWeeks(now, 2)),
        end: endOfDay(subWeeks(now, 1))
      };
    case 'year':
      return {
        start: startOfDay(subYears(now, 2)),
        end: endOfDay(subYears(now, 1))
      };
    case 'month':
    default:
      const prevMonth = subMonths(now, 1);
      return {
        start: startOfMonth(prevMonth),
        end: endOfMonth(prevMonth)
      };
  }
};

const calculateDelta = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

// Data fetching functions
const getTotalReports = async (range: DateRange): Promise<number> => {
  const [responses, complaints, appointments] = await Promise.all([
    ResponseCitizen.countDocuments({ createdAt: { $gte: range.start, $lte: range.end } }),
    Complaint.countDocuments({ createdAt: { $gte: range.start, $lte: range.end } }),
    Appointment.countDocuments({ createdAt: { $gte: range.start, $lte: range.end } })
  ]);
  
  return responses + complaints + appointments;
};

const getResolvedCases = async (range: DateRange): Promise<number> => {
  const [resolvedComplaints, approvedResponses] = await Promise.all([
    Complaint.countDocuments({ 
      status: "Resolved",
      updatedAt: { $gte: range.start, $lte: range.end } 
    }),
    ResponseCitizen.countDocuments({ 
      status: "approved",
      updatedAt: { $gte: range.start, $lte: range.end } 
    })
  ]);
  
  return resolvedComplaints + approvedResponses;
};

const getRegisteredUsers = async (range: DateRange): Promise<number> => {
  return User.countDocuments({
    role: 'Citizen', // Case-sensitive match
    createdAt: { $gte: range.start, $lte: range.end }
  });
};

const getAvgResolutionTime = async (range: DateRange): Promise<number> => {
  const result = await Complaint.aggregate([
    { 
      $match: { 
        status: "Resolved",
        updatedAt: { $gte: range.start, $lte: range.end }
      } 
    },
    {
      $project: {
        resolutionTime: {
          $divide: [
            { $subtract: ["$updatedAt", "$createdAt"] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDays: { $avg: "$resolutionTime" }
      }
    }
  ]);
  
  return result[0]?.avgDays ? Math.round(result[0].avgDays) : 0;
};

const getActiveUsers = async (range: DateRange): Promise<number> => {
  return User.countDocuments({
    lastActivity: { $gte: range.start, $lte: range.end },
    isActive: true
  });
};

const getSatisfactionScore = async (): Promise<number> => {
  // Placeholder - implement your actual satisfaction calculation
  return 84;
};

const getUserGrowthData = async (period: string) => {
  let group: Record<string, any> = {};
  let project: Record<string, any> = {};
  
  switch (period) {
    case 'week':
      group = {
        _id: { $week: "$createdAt" },
        count: { $sum: 1 }
      };
      project = {
        month: { $concat: ["Week ", { $toString: "$_id" }] },
        count: 1,
        _id: 0
      };
      break;
    case 'year':
      group = {
        _id: { $year: "$createdAt" },
        count: { $sum: 1 }
      };
      project = {
        month: { $toString: "$_id" },
        count: 1,
        _id: 0
      };
      break;
    case 'month':
    default:
      group = {
        _id: { 
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      };
      project = {
        month: { 
          $concat: [
            { $toString: "$_id.year" },
            "-",
            { $toString: "$_id.month" }
          ] 
        },
        count: 1,
        _id: 0
      };
  }
  
  return User.aggregate([
    { $match: { role: 'Citizen' } },
    { $group: group },
    { $project: project },
    { $sort: { month: 1 } }
  ]);
};

const getAppointmentStatus = async () => {
  const result = await Appointment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  
  return result.reduce((acc, curr) => ({
    ...acc,
    [curr._id]: curr.count
  }), {});
};

const getResponseTypes = async (range: DateRange) => {
  const result = await ResponseCitizen.aggregate([
    { 
      $match: { 
        createdAt: { $gte: range.start, $lte: range.end } 
      } 
    },
    { 
      $group: { 
        _id: { $cond: [{ $ne: ["$bulkFile", null] }, "file", "form"] },
        count: { $sum: 1 }
      } 
    }
  ]);
  
  return result.reduce((acc: any, curr: any) => ({
    ...acc,
    [curr._id]: curr.count
  }), {});
};

const getCategoryDistribution = async () => {
  return Complaint.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $project: { category: "$_id", count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ]);
};

const getRecentActivities = async () => {
  const complaints = await Complaint.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
    .then(complaints => complaints.map(c => ({
      ...c,
      type: 'complaint',
      timestamp: c.createdAt
    })));
    
  const appointments = await Appointment.find({}, { createdAt: 1, title: 1, description: 1, status: 1, user: 1 })
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean()
    .then(appointments => appointments.map(a => ({
      ...a,
      title: a.title,
      description: a.description || '',
      type: 'appointment',
      timestamp: (a as any).createdAt,
      status: a.status
    })));

  const responses = await ResponseCitizen.find()
    .populate('userId', 'firstName lastName')
    .populate('formId', 'title')
    .sort({ createdAt: -1 })
    .limit(2)
    .lean()
    .then(responses => responses.map(r => ({
      ...r,
      title: r.formId ? (r.formId as any).title : 'New Submission',
      description: 'Form submission',
      type: 'response',
      timestamp: r.createdAt,
      status: r.status
    })));
    
  return [...complaints, ...appointments, ...responses]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8)
    .map(item => ({
      _id: item._id.toString(),
      title: item.title || 'New Activity',
      description: item.description || 'Activity in the system',
      type: item.type,
      timestamp: item.timestamp.toISOString(),
      status: item.status || 'pending',
    ...(item && (item as any).user && {
  user: `${(item as any).user.firstName} ${(item as any).user.lastName}`
})

    }));
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
        },
        signature: response.signature ? {
          fileName: response.signature.fileName,
          fileUrl: response.signature.fileUrl,
          fileType: response.signature.mimetype,
          signedAt: response.signature.signedAt
        } : undefined
      };
    });

    res.json(formattedResponses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};