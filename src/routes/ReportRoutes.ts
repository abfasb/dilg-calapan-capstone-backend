import Express from 'express';
import { createReport, getReportForms, updateReportForms } from '../controllers/reportController';

const router = Express.Router();

router.post('/create-report', createReport);
router.get('/get-report', getReportForms);
router.put('/update-report/:id', updateReportForms);

export default router;