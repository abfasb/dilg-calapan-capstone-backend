import { NextFunction, Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import StatusHistory from '../models/StatusHistory';

export const getResponsesByForm = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const responses = await ResponseCitizen.find({ formId: req.params.formId })
      .populate('formId', 'title');
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
export const getResponseDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await ResponseCitizen.findById(req.params.id)
      .populate('formId', 'title fields')
      .populate('history');

    if (!response) {
      res.status(404).json({ message: 'Response not found' });
      return;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateResponseStatus = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { status, updatedBy } = req.body;
    const response = await ResponseCitizen.findById(req.params.id);

    if (!response) {
       res.status(404).json({ message: 'Response not found' });
       return;
    }

    const globalHistoryEntry = new StatusHistory({
      documentId: response._id,
      documentName: response.bulkFile?.fileName || `Submission ${response.referenceNumber}`,
      referenceNumber: response.referenceNumber,
      previousStatus: response.status,
      newStatus: status,
      updatedBy,
      formId: response.formId
    });

    response.history.push({
      status,
      updatedBy,
      document: response.bulkFile?.fileName || response.referenceNumber,
      timestamp: new Date()
    });

    response.status = status;
    await Promise.all([globalHistoryEntry.save(), response.save()]);

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCombinedHistory = async (req: Request, res: Response) : Promise<void> => {
  try {
    const globalHistory = await StatusHistory.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('formId', 'title');

    const recentResponses = await ResponseCitizen.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('history referenceNumber formId');

    const combinedHistory = [
      ...globalHistory.map(entry => ({
        type: 'global',
        ...entry.toObject()
      })),
      ...recentResponses.flatMap(response => 
        response.history.map(entry => ({
          type: 'local',
          documentId: response._id,
          referenceNumber: response.referenceNumber,
          formId: response.formId,
          ...entry
        }))
      )
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 50);

    res.json(combinedHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};