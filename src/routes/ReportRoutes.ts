import Express, { NextFunction, Request, Response } from 'express';
import { createReport, getReportForms, updateReportForms } from '../controllers/reportController';
import ReportForms from '../models/ReportForm';
import ResponseCitizen from '../models/ResponseCitizen';
import multer from 'multer';


const router = Express.Router();

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

const upload = multer({ storage: multer.memoryStorage() });

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

    if (req.files) {
      (req.files as Express.Multer.File[]).forEach((file) => {
        if (!formData[file.fieldname]) {
          formData[file.fieldname] = [];
        }
        formData[file.fieldname].push({
          filename: file.originalname,
          content: file.buffer.toString('base64'),
          mimetype: file.mimetype
        });
      });
    }

    const newSubmission = new ResponseCitizen({
      referenceNumber,
      formId: req.params.id,
      userId: req.body.userId,
      data: formData,
      createdAt: new Date()
    });

    await newSubmission.save();

    res.status(201).json({
      referenceNumber,
      submissionData: formData
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ 
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/*
module.exports = router;

export default router;
*/

export default router;

