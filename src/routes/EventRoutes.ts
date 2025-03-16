import express from 'express';
import { createEvent, getEvents, updateEvent, deleteEvent, getAllEvents } from '../controllers/eventController';

const router = express.Router();

router.post('/', createEvent);
router.get('/', getEvents);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

router.get('/citizen', getAllEvents);

export default router;

