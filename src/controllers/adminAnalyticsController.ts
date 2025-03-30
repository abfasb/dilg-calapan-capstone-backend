import Complaint from '../models/Complaint'
import User from '../models/User'
import Appointment from '../models/Appointment'
import ResponseCitizen from '../models/ResponseCitizen'
import { NextFunction, Request, Response } from 'express'

export const getDashboardStats = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const complaints = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ])

    const users = await User.aggregate([
      { $match: { role: 'citizen' } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])

    const appointments = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])

    const responses = await ResponseCitizen.aggregate([
      { 
        $group: { 
          _id: { $cond: [{ $ne: ['$bulkFile', null] }, 'file', 'form'] },
          count: { $sum: 1 }
        } 
      }
    ])

    res.json({
      totalReports: complaints[0]?.total || 0,
      resolvedCases: complaints[0]?.resolved || 0,
      registeredUsers: users[0]?.count || 0,
      appointments: appointments.reduce((acc, curr) => ({
        ...acc,
        [curr._id]: curr.count
      }), {}),
      responseTypes: responses.reduce((acc, curr) => ({
        ...acc,
        [curr._id]: curr.count
      }), {})
    })

  } catch (error : any) {
    res.status(500).json({ message: error.message })
  }
}

export const getTrends = async(req : Request, res : Response) : Promise<void> => {
  try {
    const complaintTrends = await Complaint.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", count: 1, _id: 0 } }
    ])

    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", count: 1, _id: 0 } }
    ])

    res.json({
      reports: complaintTrends,
      users: userGrowth
    })

  } catch (error : any) {
    res.status(500).json({ message: error.message })
  }
}

export const getIncidentBreakdown = async (req : Request, res : Response) : Promise<void> => {
  try {
    const incidents = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { category: "$_id", count: 1, _id: 0 } }
    ])

    res.json(incidents)
  } catch (error : any) {
    res.status(500).json({ message: error.message })
  }
}

export const getRecentActivities = async(req : Request, res : Response) : Promise<void> => {
  try {
    const activities = await Complaint.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      { $project: { 
          title: 1,
          description: 1,
          type: { $cond: [{ $eq: ['$status', 'pending'] }, 'alert', 'update'] },
          timestamp: "$createdAt"
        } 
      }
    ])

    res.json(activities)
  } catch (error : any) {
    res.status(500).json({ message: error.message })
  }
}