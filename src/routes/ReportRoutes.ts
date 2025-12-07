  import Express, { NextFunction, Request, Response } from 'express';
  import { createReport, getReportForms, getUserReports, updateReportForms, getUserReportsAndTracking, updateSubmissionFile, getSubmissionController, getCitizenCases} from '../controllers/reportController';
  import ReportForms from '../models/ReportForm';
  import ResponseCitizen from '../models/ResponseCitizen';
  import multer from 'multer';
  import { bucket } from '../config/firebaseConfig';
  import { v4 as uuidv4 } from 'uuid';
  import mongoose from 'mongoose';
  import _ from 'lodash';
import LGUNotication from '../models/LGUNotification';


  const router = Express.Router();

  const upload: multer.Multer = multer({ storage: multer.memoryStorage() });

router.post(
  '/create-report',
  upload.single('template'),
  async (req: Request, res: Response) : Promise<void> => {
    try {
      const { title, description, submissionType, fields, deadline } = req.body;
      const uploadedFile = req.file;

      console.log('Received form data:', {
        title,
        description,
        submissionType,
        deadline,
        hasFields: !!fields,
        hasFile: !!uploadedFile
      });

      let templateData = undefined;

      if (uploadedFile) {
        const fileRef = bucket.file(`uploads/${uuidv4()}-${uploadedFile.originalname}`);

        await fileRef.save(uploadedFile.buffer, {
          metadata: { contentType: uploadedFile.mimetype },
        });

        const [fileUrl] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-01-2030',
        });

        // @ts-ignore
        templateData = {
          fileName: uploadedFile.originalname,
          fileUrl,
          mimetype: uploadedFile.mimetype,
          uploadedAt: new Date(),
        };
      }

      let parsedFields = [];
      if (fields) {
        try {
          parsedFields = JSON.parse(fields);
        } catch (e) {
          console.error('Error parsing fields:', e);
           res.status(400).json({ error: 'Invalid fields format' });
           return;
        }
      }

      let deadlineDate = null;
      if (deadline) {
        // @ts-ignore
        deadlineDate = new Date(deadline);
        // @ts-ignore
        if (isNaN(deadlineDate.getTime())) {
          console.warn('Invalid deadline date provided:', deadline);
          deadlineDate = null;
        }
      }

      const newForm = new ReportForms({
        title,
        description,
        submissionType,
        deadline: deadlineDate, 
        fields: parsedFields,
        template: templateData,
      });

      await newForm.save();
      
      console.log('Form saved successfully:', {
        id: newForm._id,
        title: newForm.title,
        deadline: newForm.deadline
      });
      
      //@ts-ignore
      res.status(201).json({
        message: 'Form saved successfully',
        formId: newForm._id,
          // @ts-ignore
        fileUrl: templateData ? templateData.fileUrl : null
      });
    } catch (err) {
      console.error('Form creation error:', err);
      res.status(500).json({ error: 'Error saving form' });
    }
  }
);
  

router.get('/get-report', getReportForms);
router.put('/update-report/:id', upload.single('template'), updateReportForms);

router.get('/cases', getCitizenCases);
 
router.get('/:id', async (req : Request, res : Response, next: NextFunction) : Promise<void>=> {
  try {
    const report = await ReportForms.findById(req.params.id);
    if (!report) {
        res.status(404).json({ message: 'Report not found' });
        return;
    }
    
    res.json(report);
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
});


const generateReferenceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DILG-${year}${month}${day}-${random}`;
};

router.post('/:id/responses', upload.any(), async (req: Request, res: Response): Promise<void> => {
  try {
    const referenceNumber = generateReferenceNumber();
    const submissionType = req.body.submissionType;
    const uploadedFiles: { filename: string; url: string; mimetype: string }[] = [];
    let bulkFileData = null;
    const fieldNames: string[] = [];

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        fieldNames.push(file.fieldname);

        const fileRef = bucket.file(`uploads/${referenceNumber}/${file.originalname}`);
        await fileRef.save(file.buffer, {
          metadata: { contentType: file.mimetype },
        });

        const [url] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-01-2030',
        });

        if (submissionType === 'file') {
          // @ts-ignore
          bulkFileData = {
            fileName: file.originalname,
            fileType: file.mimetype,
            fileUrl: url,
            uploadedAt: new Date()
          };
        } else {
          uploadedFiles.push({
            filename: file.originalname,
            url,
            mimetype: file.mimetype
          });
        }
      }
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
       res.status(400).json({ error: "Invalid form ID" });
       return;
    }


    const newSubmission = new ResponseCitizen({
      referenceNumber,
      formId: new mongoose.Types.ObjectId(req.params.id),
      userId: req.body.userId,
      submissionType,
      data: submissionType === 'form' ? _.omit(req.body, fieldNames) : null,
      files: submissionType === 'form' ? uploadedFiles : [],
      bulkFile: submissionType === 'file' ? bulkFileData : null,
      status: "pending",
      createdAt: new Date()
    });

    await LGUNotication.create({
      userId: req.body.userId, 
      type: 'submission',
      referenceId: newSubmission._id,
      title: 'New Submission Received',
      message: `A new submission has been made with reference number ${referenceNumber}.`,
      read: false,
      createdAt: new Date()
    });

    await newSubmission.save();

    res.status(201).json({
      referenceNumber,
      submissionType,
      fileName: (bulkFileData as any).fileName || '',
      submissionData: submissionType === 'form' ? req.body : null
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/submission/:submissionId/file', upload.single('file'), updateSubmissionFile);


router.get('/my-reports/:id', getUserReports);
/*
module.exports = router;

export default router;
*/

router.get('/my-reports-track/:id', getUserReportsAndTracking);

router.get('/report/:id', getSubmissionController);


export default router;

