import express from 'express';
import { createComplaint, getAllComplaintsForAdmin, getComplaints, updateComplaintStatus } from '../controllers/complaintController';
import auth from '../middleware/auth';

const router = express.Router();

router.post('/', createComplaint);
router.get('/', auth as any, getComplaints);

router.get('/complaint-admin', getAllComplaintsForAdmin);
router.patch('/complaint-admin/:id/status', updateComplaintStatus);

export default router;