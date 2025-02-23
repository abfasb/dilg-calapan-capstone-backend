import Express from 'express';
import { createReport } from '../controllers/reportController';

const router = Express.Router();

router.post('/create-report', createReport);

export default router;