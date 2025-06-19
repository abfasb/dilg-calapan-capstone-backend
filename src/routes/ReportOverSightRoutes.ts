  import Express, { NextFunction, Request, Response } from 'express';
  import { getAllSubmissions, getSubmissionAnalytics } from '../controllers/reportOverSightController';
  import _ from 'lodash';


  const router = Express.Router();

router.get('/analytics', getSubmissionAnalytics);
router.get('/submission', getAllSubmissions);


export default router;
