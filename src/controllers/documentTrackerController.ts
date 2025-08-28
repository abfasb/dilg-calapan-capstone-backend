import { Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import User from '../models/User';
import ReportForms from '../models/ReportForm';
import mongoose from 'mongoose';

export const getAllForms = async (req: Request, res: Response) => {
  try {
    const forms = await ReportForms.find({}, 'title _id deadline');
    res.status(200).json(forms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forms', error });
  }
};

export const getAllFormSubmissions = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    
    const submissions = await ResponseCitizen.find({ formId })
      .populate('userId', 'firstName lastName barangay')
      .populate('formId', 'title deadline');
    
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all submissions', error });
  }
};

export const getFormSubmissionsByBarangay = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    
    const barangays = await User.distinct('barangay', { barangay: { $ne: null } });
    
    const submissions = await ResponseCitizen.aggregate([
      { $match: { formId: new mongoose.Types.ObjectId(formId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user.barangay',
          submissions: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const submissionMap = new Map();
    submissions.forEach(item => {
      submissionMap.set(item._id, item);
    });
    
    const result = barangays.map(barangay => {
      const submissionData = submissionMap.get(barangay);
      return {
        barangay,
        hasSubmission: !!submissionData,
        submissionCount: submissionData?.count || 0,
        latestSubmission: submissionData ? 
          submissionData.submissions.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null
      };
    });
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions', error });
  }
};

export const getSubmissionDetails = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { submissionId } = req.params;
    
    const submission = await ResponseCitizen.findById(submissionId)
      .populate('userId', 'firstName lastName barangay')
      .populate('formId', 'title fields deadline');
    
    if (!submission) {
       res.status(404).json({ message: 'Submission not found' });
       return;
    }
    
    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission details', error });
  }
};


export const updateSubmissionFile = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { submissionId } = req.params;
    const fileIndex = req.body.fileIndex ? parseInt(req.body.fileIndex) : undefined;
    
    if (!req.file) {
      res.status(400).json({ message: 'No file provided' });
      return;
    }
    
    const newFile = {
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`, 
      mimetype: req.file.mimetype
    };

    const submission = await ResponseCitizen.findById(submissionId);
    
    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }
    
    if (fileIndex !== undefined && submission.files[fileIndex]) {
      // @ts-ignore
      submission.files[fileIndex] = newFile;
    } else {
      submission.files.push(newFile);
    }
    
    submission.history.push({
      status: submission.status,
      updatedBy: (req as any).user.id,
      lguName: (req as any).user.username,
      document: 'File updated',
      timestamp: new Date(),
      assignedLgu: (submission as any).assignedLgu,
      currentStatus: submission.status
    });
    
    await submission.save();
    
    res.status(200).json({ message: 'File updated successfully', submission });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ message: 'Error updating file', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};