import { NextFunction, Request, Response } from 'express';
import AutditLogs from '../models/AutditLogs';
import { parse } from 'date-fns';

interface AuditLogQuery {
  timestamp?: { $gte?: Date; $lte?: Date };
  email?: { $regex: string; $options: string };
  action?: { $regex: string; $options: string };
  $or?: Array<{ email?: { $regex: string; $options: string } } | { action?: { $regex: string; $options: string } }>;
}

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const { page = 1, limit = 10, search, startDate, endDate, action } = req.query;

    const query: AuditLogQuery = {};

    if (search) {
      query.$or = [
        { email: { $regex: search as string, $options: 'i' } },
        { action: { $regex: search as string, $options: 'i' } }
      ];
    }

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    if (action && action !== 'all') {
      query.action = { $regex: action as string, $options: 'i' };
    }

    const logs = await AutditLogs.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AutditLogs.countDocuments(query);

    res.json({
      data: logs,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};