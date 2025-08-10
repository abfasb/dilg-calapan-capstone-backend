import express from 'express';
import { sendOTP } from '../controllers/otpController';

const router = express.Router();

router.post('/', sendOTP);

export default router;

