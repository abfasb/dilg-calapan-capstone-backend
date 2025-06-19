import Express, { Request, Response, NextFunction} from 'express';
import ResponseCitizen from '../models/ResponseCitizen';


export const getSubmissionAnalytics = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const results = await ResponseCitizen.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    const analytics = results[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllSubmissions = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const submissions = await ResponseCitizen.find()
      .populate('formId', 'title')
      .populate('userId', 'name email')
      .populate('history.assignedLgu', 'name')
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};