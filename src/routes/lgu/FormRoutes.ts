import express from 'express';
import { getForms, getFormById } from '../../controllers/formController';
import { getDocumentStatusHistory, getLGUProcessedDocuments, getUserDocuments } from '../../controllers/reportController';
import { getLGUUsers } from '../../controllers/authController';

const router = express.Router();

router.get('/', getForms);
router.get('/:id', getFormById);

router.get('/documents/haha', getUserDocuments)

router.get('/users/haha', getLGUUsers)
router.get('/statushistories/haha', getDocumentStatusHistory)
router.get('/lgudocuments', getLGUProcessedDocuments)

export default router;