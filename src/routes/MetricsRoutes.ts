import { Router } from 'express';
import { getPerformanceMetrics, getHealthCheck } from '../controllers/performanceMetricsController';
const router = Router();

router.get('/metrics', getPerformanceMetrics);

router.get('/health', getHealthCheck);

router.get('/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    res.json({
      success: true,
      status: stateMap[connectionState as keyof typeof stateMap] || 'unknown',
      readyState: connectionState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get database status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;