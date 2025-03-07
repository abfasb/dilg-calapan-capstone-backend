  import Express, { NextFunction, Request, Response } from 'express';
  import { createReport, getReportForms, updateReportForms } from '../controllers/reportController';
  import ReportForms from '../models/ReportForm';
  import ResponseCitizen from '../models/ResponseCitizen';
  import multer from 'multer';
  import bucket from '../config/firebaseConfig';

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

router.post('/:id/responses', upload.any(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referenceNumber = generateReferenceNumber();
    const formData: Record<string, any> = { ...req.body };
    const uploadedFiles: { filename: string; url: string; mimetype: string }[] = [];

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        const multerFile = file; 
        const fileRef = bucket.file(`uploads/${referenceNumber}/${multerFile.originalname}`);
        
        await fileRef.save(multerFile.buffer, {
          metadata: { contentType: multerFile.mimetype },
        });

        const [url] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-01-2030',
        });

        uploadedFiles.push({ filename: multerFile.originalname, url, mimetype: multerFile.mimetype });
      }
    }

    if (uploadedFiles.length > 0) {
      formData.files = uploadedFiles;
    }

    const newSubmission = new ResponseCitizen({
      referenceNumber,
      formId: req.params.id,
      userId: req.body.userId,
      data: formData,
      createdAt: new Date(),
    });

    await newSubmission.save();

    res.status(201).json({
      referenceNumber,
      submissionData: formData,
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/*
module.exports = router;

export default router;
*/

export default router;

