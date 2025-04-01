import express from 'express';
import { getCombinedHistory, getResponseDetails, getResponsesByForm, updateResponseStatus } from '../../controllers/responseController';

const router = express.Router();

router.get('/:formId', getResponsesByForm);
router.put('/:id', updateResponseStatus);

router.get('/details/:id', getResponseDetails);
router.get('/history/combined', getCombinedHistory);

export default router;