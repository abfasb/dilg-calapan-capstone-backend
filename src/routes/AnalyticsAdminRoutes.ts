import express from 'express'
import { getDashboardData } from '../controllers/adminAnalyticsController'

const router = express.Router()

router.get('/dashboard-data', getDashboardData);

export default router