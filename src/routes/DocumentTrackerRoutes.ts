import express from 'express';
import {
  getFormSubmissionsByBarangay,
  getSubmissionDetails,
  updateSubmissionFile,
  getAllForms
} from '../controllers/documentTrackerController';

const router = express.Router();

router.get('/forms',  getAllForms);
router.get('/submissions/:formId',  getFormSubmissionsByBarangay);
router.get('/submission/:submissionId', getSubmissionDetails);
router.put('/submission/:submissionId/file', updateSubmissionFile);

export default router;