import Express, { NextFunction, Request, Response } from 'express';
import { createReport, getReportForms, updateReportForms } from '../controllers/reportController';
import ReportForms from '../models/ReportForm';


const router = Express.Router();

router.post('/create-report', createReport);
router.get('/get-report', getReportForms);
router.put('/update-report/:id', updateReportForms);


 /*
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

router.post('/:id/responses', async (req : Request, res : Response, next: NextFunction) : Promise<void>  => {
  try {
    const report = await ReportForms.findById(req.params.id);
    if (!report) {
        res.status(404).json({ message: 'Report not found' });
        return;
    };
    
    const response = {
      data: req.body,
      submittedAt: new Date()
    };
    
    report.responses.push(response);
    await report.save();
    
    res.status(201).json(response);
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

export default router;
*/

export default router;

