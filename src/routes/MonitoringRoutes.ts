import { Router } from 'express';
import { getForms, getMonitoringData, sendNotification } from '../controllers/monitoringController';
import ResponseCitizen from '../models/ResponseCitizen';
const router = Router();

router.post('/send-notification', sendNotification);

router.get('/get-forms', getForms);
router.get('/get-monitoring', getMonitoringData);

router.get("/stats", async (req, res) :Promise<void> => {
  try {
    const totalSubmissions = await ResponseCitizen.countDocuments();
    const approved = await ResponseCitizen.countDocuments({ status: "approved" });
    const rejected = await ResponseCitizen.countDocuments({ status: "rejected" });

    res.status(200).json({
      totalSubmissions,
      approved,
      rejected,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
});

export default router;