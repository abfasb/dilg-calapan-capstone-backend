import express, {Request, Response} from 'express';
import { createUser, loginUser, forgotPasswordUser, resetPasswordUser, resetPasswordGetEmail, updateProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
//forgotPasswordUser, resetPasswordUser


router.post('/create-user', createUser);
router.post('/signin-user', loginUser);
router.post('/forgot-password', forgotPasswordUser);
router.post('/reset-password/:token', resetPasswordUser);
router.get('/reset-password/:token', resetPasswordGetEmail);

router.put('/profile', updateProfile);
//router.post('/api/barangay', loginUser);

export default router;