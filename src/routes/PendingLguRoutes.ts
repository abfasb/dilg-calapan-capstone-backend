import Express from 'express';
import { createPendingLgu, getAllPendingLgu, approveOrRejectLgu } from '../controllers/pendingLGUController';

const router = Express.Router();

router.post('/pendingLgus', createPendingLgu);
  
router.get('/pendingLgus', getAllPendingLgu);
  
router.put('/pendingLgus/:id', approveOrRejectLgu);

export default router;