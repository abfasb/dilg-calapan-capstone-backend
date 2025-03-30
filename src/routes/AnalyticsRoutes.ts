import express from 'express';
import {
  getUserStats,
  getFormStats,
  getRecentActivity,
  getResponseStats,
  getFormResponses, 
  getSubmissionTrends,
  getLGUStats,
  getTrendData,
  getRecentActivities,
  getDashboardStats,
  getReportTrends
} from '../controllers/analyticsController';

const router = express.Router();

router.get('/user-stats', getUserStats);
router.get('/form-stats', getFormStats);
router.get('/recent-activity', getRecentActivity);

router.get('/response-stats', getResponseStats);
router.get('/form-responses', getFormResponses);
router.get('/submission-trends', getSubmissionTrends);

router.get('/stats', getLGUStats);
router.get('/trends', getTrendData);
router.get('/activities', getRecentActivities);

router.get('/dashboard-stats', getDashboardStats);
router.get('/report-trends', getReportTrends);


export default router;