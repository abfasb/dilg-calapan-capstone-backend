import { Router } from 'express';
import { getForms, getMonitoringData, sendNotification } from '../controllers/monitoringController';
const router = Router();

router.post('/send-notification', sendNotification);

router.get('/get-forms', getForms);
router.get('/get-monitoring', getMonitoringData);


export default router;