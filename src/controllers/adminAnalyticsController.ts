import { NextFunction, Request, Response } from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import Appointment from '../models/Appointment';
import ResponseCitizen from '../models/ResponseCitizen';
import ReportForms from '../models/ReportForm';
import { subMonths, startOfMonth, endOfMonth, subWeeks, subYears } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
}

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'month';
    
    const currentRange = getDateRange(period);
    const previousRange = getPreviousDateRange(period);
    
    const [
      totalReports,
      resolvedCases,
      registeredUsers,
      avgResolutionTime,
      activeUsers,
      userGrowth,
      appointmentStatus,
      responseTypes,
      categoryDistribution,
      recentActivities
    ] = await Promise.all([
      getTotalReports(currentRange),
      getResolvedCases(currentRange),
      getRegisteredUsers(currentRange),
      getAvgResolutionTime(currentRange),
      getActiveUsers(currentRange),
      getUserGrowthData(period),
      getAppointmentStatus(),
      getResponseTypes(currentRange),
      getCategoryDistribution(),
      getRecentActivities()
    ]);

    // Calculate deltas
    const previousReports = await getTotalReports(previousRange);
    const previousResolved = await getResolvedCases(previousRange);
    const previousUsers = await getRegisteredUsers(previousRange);
    const previousActive = await getActiveUsers(previousRange);
    
    const result = {
      totalReports,
      resolvedCases,
      registeredUsers,
      avgResolutionTime,
      activeUsers,
      satisfaction: await getSatisfactionScore(),
      userGrowth,
      appointmentStatus,
      responseTypes,
      categoryDistribution,
      recentActivities,
      deltas: {
        reports: calculateDelta(totalReports, previousReports),
        resolved: calculateDelta(resolvedCases, previousResolved),
        users: calculateDelta(registeredUsers, previousUsers),
        resolutionTime: 0, // Placeholder
        satisfaction: 0, // Placeholder
        activeUsers: calculateDelta(activeUsers, previousActive)
      }
    };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Helper functions
const getDateRange = (period: string): DateRange => {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return {
        start: subWeeks(now, 1),
        end: now
      };
    case 'year':
      return {
        start: subYears(now, 1),
        end: now
      };
    case 'month':
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
  }
};

const getPreviousDateRange = (period: string): DateRange => {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return {
        start: subWeeks(now, 2),
        end: subWeeks(now, 1)
      };
    case 'year':
      return {
        start: subYears(now, 2),
        end: subYears(now, 1)
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
  return ResponseCitizen.countDocuments({
    createdAt: { $gte: range.start, $lte: range.end }
  });
};

const getResolvedCases = async (range: DateRange): Promise<number> => {
  return ResponseCitizen.countDocuments({
    status: "approved",
    updatedAt: { $gte: range.start, $lte: range.end }
  });
};

const getRegisteredUsers = async (range: DateRange): Promise<number> => {
  return User.countDocuments({
    role: 'citizen',
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
      $group: {
        _id: null,
        avgDays: { 
          $avg: { 
            $divide: [
              { $subtract: ["$updatedAt", "$createdAt"] }, 
              1000 * 60 * 60 * 24
            ] 
          } 
        }
      }
    }
  ]);
  
  return result[0]?.avgDays ? Math.round(result[0].avgDays) : 0;
};

const getActiveUsers = async (range: DateRange): Promise<number> => {
  return User.countDocuments({
    lastLogin: { $gte: range.start, $lte: range.end }
  });
};

const getSatisfactionScore = async (): Promise<number> => {
  // Placeholder - implement your actual satisfaction calculation
  return Math.floor(Math.random() * 20) + 80; // Random between 80-100%
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
    { $match: { role: 'citizen' } },
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
  
  return result.reduce((acc : any, curr : any) => ({
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
    
  const appointments = await Appointment.find()
  .sort({ createdAt: -1 })
  .limit(3)
  .lean()
  .then((appointments: any[]) => appointments.map(a => ({
    ...a,
    type: 'appointment',
    timestamp: a.createdAt
  })));


    const rawResponses: any[] = await ResponseCitizen.find()
      .sort({ createdAt: -1 })
      .limit(2)
      .lean(); 

    const responses = rawResponses.map(r => ({
      ...r,
      type: 'response',
      timestamp: r.createdAt
    }));

    
  return [...complaints, ...appointments, ...responses]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8)
    .map(item => ({
      _id: item._id.toString(),
      title: item.title || 'New Submission',
      description: item.description || 'Activity in the system',
      type: item.type,
      timestamp: item.timestamp.toISOString(),
      status: item.status || 'pending'
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