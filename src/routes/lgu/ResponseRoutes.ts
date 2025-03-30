import express from 'express';
import { getResponseDetails, getResponsesByForm, updateResponseStatus } from '../../controllers/responseController';

const router = express.Router();

router.get('/:formId', getResponsesByForm);
router.put('/:id', updateResponseStatus);

router.get('/details/:id', getResponseDetails);

export default router;