import Express, { Request, Response, NextFunction} from 'express';
import ReportForms from '../models/ReportForm'
import ResponseCitizen from '../models/ResponseCitizen';
import StatusHistory from '../models/StatusHistory';
import bucket from '../config/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export const createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, fields } = req.body;
    const uploadedFile = Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null;

    let templateData = undefined;

    if (uploadedFile) {
      const referenceNumber = `REPORT-${uuidv4()}`;
      const fileRef = bucket.file(`uploads/templates/${referenceNumber}/${uploadedFile.originalname}`);

      await fileRef.save(uploadedFile.buffer, {
        metadata: { contentType: uploadedFile.mimetype },
      });

      const [fileUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2030',
      });

      templateData = {
        fileName: uploadedFile.originalname,
        fileUrl,
        mimetype: uploadedFile.mimetype,
        uploadedAt: new Date(),
      };
    }

    const newForm = new ReportForms({
      title,
      description,
      fields: JSON.parse(fields),
      templateFile: templateData
    });

    await newForm.save();

    res.status(201).json({ message: "Form saved successfully" });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: "Error saving form" });
  }
};


export const getReportForms = async (req : Request, res : Response, next : NextFunction) : Promise<void> => {
    try {
      const forms = await ReportForms.find();
      res.status(200).json(forms);
    } catch (err) {
      res.status(500).json({ error: "Error fetching forms" });
    }
  }

  

export const updateReportForms = async (req : Request, res : Response, next : NextFunction) : Promise <void> => {
  try {
    const { id } = req.params
    const updateData = req.body

    const updatedForm = await ReportForms.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!updatedForm) {
      res.status(404).json({ success: false, message: 'Form not found' })
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Form updated successfully',
      data: updatedForm
    })
  } catch (error) {
    console.error('Update error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Server error during form update',
    })
  }
}
  export const getUserReports = async (req: Request, res: Response) => {
    try {
      const responses = await ResponseCitizen.find({ userId: req.params.id })
        .populate({
          path: 'formId',
          select: 'title fields',
           model: 'ReportForms' 
        });
      
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  };

export const getUserReportsAndTracking = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      ResponseCitizen.find({ id })
        .populate({ path: 'formId', select: 'title' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ResponseCitizen.countDocuments({ id })
    ]);

    const reports = responses.map(response => ({
      _id: response._id,
      caseId: response.referenceNumber,
      title: typeof response.formId === 'object' && 'title' in response.formId ? response.formId.title : 'Deleted Form',
      status: response.status,
      createdAt: response.createdAt,
      updatedAt: 'updatedAt' in response ? response.updatedAt : null,
      category: typeof response.formId === 'object' && 'title' in response.formId ? response.formId.title : 'General' // Using form title as category
    }));

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

interface IReportForm {
  _id: string;
  referenceNumber: string;
  createdAt: Date;
  data: any;
  user: any;
  formFields: any;
  files: {
    filename: string;
    url: string;
    mimetype: string;
  }[];
}

export const getSubmissionController = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const report = await ReportForms.findById(req.params.id)
      .populate('user', 'firstName lastName position barangay phoneNumber')
      .populate('formFields')
      .lean<IReportForm>();

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const response = {
      ...report,
      user: report.user || {},
      formFields: report.formFields || [],
      files: report.files.map(file => ({
        filename: file.filename,
        url: file.url,
        mimetype: file.mimetype
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export const getUserDocuments = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const documents = await ResponseCitizen.find({ userId: req.query.userId })
      .select('-__v')
      .lean();
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error });
  }
};


export const getLGUProcessedDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, lguId } = req.query;

    const filter: any = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      filter.status = status;
    }

    if (lguId && mongoose.isValidObjectId(lguId)) {
      filter['history.lguId'] = new mongoose.Types.ObjectId(lguId as string);
    }
    
    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'Users',
          localField: 'userId',
          foreignField: '_id',
          as: 'citizen'
        }
      },
      { $unwind: '$citizen' },
      {
        $lookup: {
          from: 'users',
          localField: 'history.lguId',
          foreignField: '_id',
          as: 'lguUsers'
        }
      },
      {
        $project: {
          referenceNumber: 1,
          status: 1,
          'citizen.firstName': 1,
          'citizen.lastName': 1,
          submittedDate: '$createdAt',
          processedDate: { $max: '$history.timestamp' },
          comments: 1,
          history: {
            $map: {
              input: '$history',
              as: 'h',
              in: {
                status: '$$h.status',
                updatedBy: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$lguUsers',
                        as: 'u',
                        cond: { $eq: ['$$u._id', '$$h.lguId'] }
                      }
                    },
                    0
                  ]
                },
                timestamp: '$$h.timestamp',
                comments: '$$h.comments'
              }
            }
          }
        }
      }
    ];

    const documents = await ResponseCitizen.aggregate(aggregationPipeline)
    .allowDiskUse(true)
    .catch(error => {
      console.error('Aggregation error:', error);
      throw error;
    });

    const processedDocuments = documents.map(doc => ({
      ...doc,
      citizenName: `${doc.citizen.firstName} ${doc.citizen.lastName}`,
      history: doc.history.map((h: any) => ({
        status: h.status,
        updatedBy: h.updatedBy ?
          `${h.updatedBy.firstName} ${h.updatedBy.lastName}` : 'System',
        timestamp: h.timestamp,
        comments: h.comments
      }))
    }));

    res.status(200).json({ documents: processedDocuments });

  } catch (error) {
    console.error('Error fetching LGU processed documents:', error);
    res.status(500).json({ message: 'Server error while processing documents' });
  }
}


export const getDocumentStatusHistory = async (req: Request, res: Response, next : NextFunction) : Promise<void> => {
  try {
    const { documentId } = req.query
    
    if (!documentId) {
      res.status(400).json({ message: 'Document ID is required' })
      return;
    }
    
    if (!mongoose.isValidObjectId(documentId)) {
       res.status(400).json({ message: 'Invalid Document ID format' })
       return;
    }

    const history = await StatusHistory.find({ documentId })
      .sort({ timestamp: -1 })
      .populate('lguId', 'firstName lastName -_id')

    const formattedHistory = history.map(record => ({
      status: record.newStatus,
      updatedBy: record.lguId && typeof record.lguId !== 'string' && 'firstName' in record.lguId && 'lastName' in record.lguId
        ? `${record.lguId.firstName} ${record.lguId.lastName}`
        : 'System',
      timestamp: record.timestamp,
      previousStatus: record.previousStatus,
      documentName: record.documentName,
      referenceNumber: record.referenceNumber
    }))

    res.status(200).json(formattedHistory)

  } catch (error) {
    console.error('Error fetching document history:', error)
    res.status(500).json({ message: 'Server error while fetching document history' })
  }
}