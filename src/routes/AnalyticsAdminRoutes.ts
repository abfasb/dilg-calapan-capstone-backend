import express from 'express'
import { getDashboardStats, getTrends, getIncidentBreakdown, getRecentActivities } from '../controllers/adminAnalyticsController'
const router = express.Router()

router.get('/stats', getDashboardStats)
router.get('/trends', getTrends)
router.get('/incidents', getIncidentBreakdown)
router.get('/activities', getRecentActivities)

export default router