import express from 'express';
import { getAuditLogs } from '../controllers/auditLogsController';

const router = express.Router();

router.get('/', getAuditLogs);

export default router;

