import express from 'express';
import { getStaff } from '../../controllers/staffController';

const router = express.Router();

router.get('/', getStaff);

export default router;