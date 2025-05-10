import express from 'express';
import { getApprovalRates, getApprovedCitizens, getStaff } from '../../controllers/staffController';

const router = express.Router();

router.get('/', getStaff);

router.get('/approval-rates',  getApprovalRates);
router.get('/approved-citizens', getApprovedCitizens);

export default router;