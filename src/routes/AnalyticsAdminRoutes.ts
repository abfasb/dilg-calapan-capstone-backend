import express from 'express'
import { getApprovedResponses, getDashboardData, getReports } from '../controllers/adminAnalyticsController'

const router = express.Router()

router.get('/dashboard-data', getDashboardData);

router.get('/reports', getReports);
router.get('/reports/approved', getApprovedResponses);

///api/analytics/admin/reports

export default router