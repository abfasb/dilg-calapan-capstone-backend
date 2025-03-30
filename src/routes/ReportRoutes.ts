  import Express, { NextFunction, Request, Response } from 'express';
  import { createReport, getReportForms, getUserReports, updateReportForms, getUserReportsAndTracking} from '../controllers/reportController';
  import ReportForms from '../models/ReportForm';
  import ResponseCitizen from '../models/ResponseCitizen';
  import multer from 'multer';
  import bucket from '../config/firebaseConfig';
  import _ from 'lodash';


  const router = Express.Router();

  const upload: multer.Multer = multer({ storage: multer.memoryStorage() });

router.post('/create-report', createReport);
router.get('/get-report', getReportForms);
router.put('/update-report/:id', updateReportForms);


 
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

    const newSubmission = new ResponseCitizen({
      referenceNumber,
      formId: req.params.id,
      userId: req.body.userId,
      submissionType,
      data: submissionType === 'form' ? _.omit(req.body, fieldNames) : null,
      files: submissionType === 'form' ? uploadedFiles : [],
      bulkFile: submissionType === 'file' ? bulkFileData : null,
      status: "pending",
      createdAt: new Date()
    });

    await newSubmission.save();

    res.status(201).json({
      referenceNumber,
      submissionType,
      fileName: bulkFileData?.fileName || '',
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

router.get('/my-reports/:id', getUserReports);
/*
module.exports = router;

export default router;
*/

router.get('/my-reports-track/:id', getUserReportsAndTracking);


export default router;

