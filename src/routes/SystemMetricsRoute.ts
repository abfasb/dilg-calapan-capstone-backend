import express from 'express';
import { getSystemMetrics, getHistoricalData, getActiveAlerts, acknowledgeAlert } from '../controllers/systemMetrics';

const router = express.Router();

// System metrics endpoints
router.get('/metrics', getSystemMetrics);
router.get('/history', getHistoricalData);

// Alert endpoints
router.get('/alerts', getActiveAlerts);
router.patch('/alerts/:id/acknowledge', acknowledgeAlert);

export default router;