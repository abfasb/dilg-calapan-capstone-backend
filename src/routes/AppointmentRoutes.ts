import express from 'express';
import { createAppointment, getAllAppointmentsByLGU, getAppointments, updateAppointmentStatus } from '../controllers/appointmentController';

const router = express.Router();

router.post('/',  createAppointment);
router.get('/', getAppointments);
router.patch('/:id/status', updateAppointmentStatus);
router.get('/lgu', getAllAppointmentsByLGU);

export default router;

