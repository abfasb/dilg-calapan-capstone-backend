import express from 'express';
import { getResponsesByForm, updateResponseStatus } from '../../controllers/responseController';

const router = express.Router();

router.get('/:formId', getResponsesByForm);
router.put('/:id', updateResponseStatus);

export default router;