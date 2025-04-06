import { NextFunction, Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import StatusHistory from '../models/StatusHistory';
import bucket from '../config/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

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
    const { status, updatedBy, comments } = req.body;
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
      timestamp: new Date(),
      comments: comments || ''
    });

    response.status = status;
    if (comments) {
      response.comments = comments;  
    }
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


export const getResponseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await ResponseCitizen.findById(req.params.id)
      .populate({
        path: 'formId',
        select: 'title fields',
        model: 'ReportForms'
      });

    if (!response) {
      res.status(404).json({ message: 'Response not found' });
      return;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, submissionType } = req.body;
    const uploadedFiles = req.files as Express.Multer.File[];
    const updateData: any = {
      status: 'pending',
      updatedAt: new Date(),
      $unset: { comments: 1 }
    };

    const processedFiles = [];
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fileRef = bucket.file(`uploads/${req.params.id}/${file.originalname}`);
        await fileRef.save(file.buffer, { metadata: { contentType: file.mimetype } });
        const [url] = await fileRef.getSignedUrl({ action: 'read', expires: '03-01-2030' });
        
        processedFiles.push({
          filename: file.originalname,
          url,
          mimetype: file.mimetype
        });
      }
    }

    if (submissionType === 'form') {
      updateData.data = JSON.parse(data);
      
      if (processedFiles.length > 0) {
        updateData.$set = { files: processedFiles };
      }
    }

    const updatedResponse = await ResponseCitizen.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({
      message: 'Response updated successfully',
      updatedResponse
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      message: 'Update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};