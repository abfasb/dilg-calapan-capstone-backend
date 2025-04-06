// form.routes.ts
import express from 'express';
import { getForms, getFormById } from '../../controllers/formController';
import { getDocumentStatusHistory, getUserDocuments } from '../../controllers/reportController';
import { getLGUUsers } from '../../controllers/authController';

const router = express.Router();

router.get('/', getForms);
router.get('/:id', getFormById);

router.get('/users/haha', getLGUUsers)
router.get('/documents/haha', getUserDocuments)
router.get('/statushistories/haha', getDocumentStatusHistory)

export default router;