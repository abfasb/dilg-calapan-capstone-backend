import express from 'express';
import {
  getUserStats,
  getFormStats,
  getRecentActivity
} from '../controllers/analyticsController';

const router = express.Router();

router.get('/user-stats', getUserStats);
router.get('/form-stats', getFormStats);
router.get('/recent-activity', getRecentActivity);

export default router;