import express from 'express';
import { createComplaint, getComplaints } from '../controllers/complaintController';
import auth from '../middleware/auth';

const router = express.Router();

router.post('/', createComplaint);
router.get('/', auth as any, getComplaints);

export default router;