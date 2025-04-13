import express from 'express';
import { getCombinedHistory, getResponseById, getResponseDetails, getResponsesByForm, updateResponse, updateResponseStatus } from '../../controllers/responseController';
import multer from 'multer';

const upload: multer.Multer = multer({ storage: multer.memoryStorage() });


const router = express.Router();

router.get('/:formId', getResponsesByForm);
router.put('/:id', updateResponseStatus);

router.get('/details/:id', getResponseDetails);
router.get('/history/combined', getCombinedHistory);


router.get('/revise/:id', getResponseById);
router.put('/revise/:id', upload.array('files'), updateResponse);


export default router;