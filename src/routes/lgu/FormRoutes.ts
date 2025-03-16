// form.routes.ts
import express from 'express';
import { getForms, getFormById } from '../../controllers/formController';

const router = express.Router();

router.get('/', getForms);
router.get('/:id', getFormById);

export default router;