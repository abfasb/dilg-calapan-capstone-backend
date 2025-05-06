import express from 'express';
import { createComplaint, getAllComplaintsForAdmin, getCitizenComplaints, getComplaintDetails, getComplaints, updateComplaintStatus } from '../controllers/complaintController';
import auth from '../middleware/auth';

const router = express.Router();

router.post('/', createComplaint);
router.get('/', auth as any, getComplaints);

router.get('/complaint-admin', getAllComplaintsForAdmin);
router.patch('/complaint-admin/:id/status', updateComplaintStatus);

router.get('/complaint-citizen/', getCitizenComplaints);
router.get('/complaint-citizen/details', getComplaintDetails);


export default router;