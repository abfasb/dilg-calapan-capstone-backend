import { NextFunction, Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import StatusHistory from '../models/StatusHistory';
import { bucket, messaging } from '../config/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import mongoose from 'mongoose';
import User from '../models/User';

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

export const updateResponseStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, updatedBy, comments } = req.body;
    const signatureFile = req.file;
    const response = await ResponseCitizen.findById(req.params.id);

    if (!response) {
      res.status(404).json({ message: 'Response not found' });
      return;
    }

    if (status === 'approved' && !signatureFile) {
      res.status(400).json({ message: 'Signature is required for approval' });
      return;
    }

    let signatureData = null;
    if (status === 'approved' && signatureFile) {
      const fileRef = bucket.file(`signatures/${uuidv4()}-${signatureFile.originalname}`);
      await fileRef.save(signatureFile.buffer, {
        metadata: { contentType: signatureFile.mimetype },
      });
      const [fileUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2030',
      });
      signatureData = {
        fileName: signatureFile.originalname,
        fileUrl,
        mimetype: signatureFile.mimetype,
        signedAt: new Date(),
      };
    }
    
    const lguIdRaw = req.body.lgu?.id;
    let lguId: mongoose.Types.ObjectId | null = null;

    if (mongoose.Types.ObjectId.isValid(lguIdRaw)) {
      lguId = new mongoose.Types.ObjectId(lguIdRaw);
    } else {
      console.warn('Invalid LGU ID:', lguIdRaw);
      lguId = null;
    }

    const globalHistoryEntry = new StatusHistory({
      documentId: response._id,
      documentName: response.bulkFile?.fileName || `Submission ${response.referenceNumber}`,
      referenceNumber: response.referenceNumber,
      previousStatus: response.status,
      newStatus: status,
      updatedBy,
      lguId,
      lguName: req.body.lgu?.name,
      formId: response.formId,
    });



    const lguName = req.body.lgu?.name;

    response.history.push({
      status,
      updatedBy,
      lguId,
      lguName,
      document: response.bulkFile?.fileName || response.referenceNumber,
      timestamp: new Date(),
      comments: comments || ''
    });

    response.status = status;
    if (comments) response.comments = comments;
    if (signatureData) response.signature = signatureData;

    await Promise.all([globalHistoryEntry.save(), response.save()]);

    const user = await User.findById(response.userId);

    if (user?.fcmToken) {
      await messaging.send({
        token: user.fcmToken,
        notification: {
          title: `Your request has been ${status}`,
          body: comments || 'Please check your submission for more details.'
        },
        data: {
          referenceNumber: response.referenceNumber,
          status,
          click_action: `${process.env.FRONTEND_URL}/account/citizen/my-report/${user._id}`
        }
      });
    }
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
    const { submissionType } = req.body;
    const uploadedFiles = req.files as Express.Multer.File[];
    const updateData: any = {
      status: 'rejected',
      updatedAt: new Date(),
      $unset: { comments: 1 }
    };

    const existingResponse = await ResponseCitizen.findById(req.params.id);
    if (!existingResponse) {
      res.status(404).json({ message: 'Response not found' });
      return;
    }

    if (existingResponse.status === "rejected") {
      updateData.isUserUpdatedRejected = true;
    }


    const processedFiles = [];
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const filePath = `uploads/${req.params.id}/${Date.now()}_${file.originalname}`;
        const fileRef = bucket.file(filePath);
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
      updateData.data = JSON.parse(req.body.data);
      
      if (processedFiles.length > 0) {
        updateData.$set = { files: processedFiles };
      }
    } else if (submissionType === 'bulk') {
      if (processedFiles.length === 0) {
        throw new Error('No file uploaded for bulk submission');
      }

      if (existingResponse.bulkFile?.fileUrl) {
        const decodedUrl = decodeURIComponent(existingResponse.bulkFile.fileUrl);
        const match = decodedUrl.match(/\/o\/(.*?)\?/);
        if (match && match[1]) {
          const filePath = match[1];
          const oldFileRef = bucket.file(filePath);
          await oldFileRef.delete().catch(console.error);
        }
      }
      

      updateData.$set = {
        bulkFile: {
          fileName: processedFiles[0].filename,
          fileType: processedFiles[0].mimetype,
          fileUrl: processedFiles[0].url,
          uploadedAt: new Date()
        }
      };
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