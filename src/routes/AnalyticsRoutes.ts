import express from 'express';
import {
  getUserStats,
  getFormStats,
  getRecentActivity,
  getResponseStats,
  getFormResponses, 
  getSubmissionTrends
} from '../controllers/analyticsController';

const router = express.Router();

router.get('/user-stats', getUserStats);
router.get('/form-stats', getFormStats);
router.get('/recent-activity', getRecentActivity);

router.get('/response-stats', getResponseStats);
router.get('/form-responses', getFormResponses);
router.get('/submission-trends', getSubmissionTrends);

export default router;