import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';

// In-memory storage for historical data
let cpuHistory: Array<{ time: string; usage: number }> = [];
let memoryHistory: Array<{ time: string; usage: number }> = [];
let networkHistory: Array<{ time: string; latency: number }> = [];
let previousDocumentCount = 0;

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  databaseStatus: string;
  uptime: string;
  networkLatency: number;
  storage: {
    used: number;
    total: number;
    breakdown: Array<{
      type: string;
      value: number;
      color: string;
    }>;
  };
  recentIncidents: Array<{
    timestamp: string;
    service: string;
    status: string;
    duration: string;
  }>;
  cpuHistory: Array<{
    time: string;
    usage: number;
  }>;
  memoryHistory: Array<{
    time: string;
    usage: number;
  }>;
  networkHistory: Array<{
    time: string;
    latency: number;
  }>;
  queryPerformance: {
    avgLatency: number;
    indexHitRatio: number;
    latencyTrend: number;
    indexTrend: number;
  };
  sharding: Array<{
    name: string;
    status: string;
    usage: number;
    size: string;
    chunks: number;
  }>;
  documentCount: number;
  documentGrowth: number;
}

async function getDatabaseStats() {
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established.');
    }
    const admin = mongoose.connection.db.admin();
    const stats = await mongoose.connection.db.stats();
    const serverStatus = await admin.serverStatus();
    
    return { stats, serverStatus };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}

// Helper function to calculate CPU usage
function getCPUUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  
  for (let cpu of cpus) {
    for (let type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  
  return Math.min(100, (1 - totalIdle / totalTick) * 100);
}

// Helper function to get memory usage
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    used: Math.round((usedMem / totalMem) * 100),
    total: Math.round(totalMem / (1024 * 1024 * 1024)), // GB
    free: Math.round(freeMem / (1024 * 1024 * 1024)) // GB
  };
}

// Helper function to get collection stats
async function getCollectionStats() {
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established.');
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    let totalDocuments = 0;
    let totalSize = 0;
    
    for (const collection of collections) {
      try {
        const stats = await mongoose.connection.db.command({ collStats: collection.name });
        totalDocuments += stats.count || 0;
        totalSize += stats.size || 0;
      } catch (error) {
        // Skip collections that can't be accessed
        continue;
      }
    }
    
    return { totalDocuments, totalSize };
  } catch (error) {
    console.error('Error getting collection stats:', error);
    return { totalDocuments: 0, totalSize: 0 };
  }
}

// Helper function to get sharding information
async function getShardingInfo() {
  try {
    if (!mongoose.connection.db) {
      return [];
    }
    
    const adminDb = mongoose.connection.db.admin();
    let shards = [];
    
    try {
      // Try to get sharding information
      const shardResult = await adminDb.command({ listShards: 1 });
      shards = shardResult.shards || [];
    } catch (error) {
      // If not a sharded cluster, return empty array
      return [];
    }
    
    return shards.map((shard: any) => ({
      name: shard._id || 'Unknown',
      status: shard.state === 1 ? 'Active' : 'Inactive',
      usage: Math.round(Math.random() * 40 + 60), // 60-100% - in real scenario, get from stats
      size: `${Math.round(Math.random() * 100 + 400)}GB`, // Simulated size
      chunks: Math.round(Math.random() * 20 + 30) // 30-50 chunks
    }));
  } catch (error) {
    console.error('Error getting sharding info:', error);
    return [];
  }
}

// Helper function to get recent incidents from database (simulated)
async function getRecentIncidents() {
  try {
    // In a real application, you would query your incidents database here
    // This is a simulation that returns recent incidents with a 10% chance of a current issue
    const hasCurrentIssue = Math.random() > 0.9;
    
    const incidents = [
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        service: 'Query Engine',
        status: 'resolved',
        duration: '2h 15m'
      },
      {
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        service: 'Storage Engine',
        status: 'resolved',
        duration: '1h 30m'
      }
    ];
    
    if (hasCurrentIssue) {
      incidents.unshift({
        timestamp: new Date().toISOString(),
        service: 'Network',
        status: 'investigating',
        duration: 'Ongoing'
      });
    }
    
    return incidents;
  } catch (error) {
    console.error('Error getting recent incidents:', error);
    return [];
  }
}

export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const databaseStatus = connectionState === 1 ? 'normal' : 
                          connectionState === 0 ? 'disconnected' : 
                          connectionState === 2 ? 'connecting' : 'disconnecting';

    // Get system metrics
    const cpuUsage = getCPUUsage();
    const memoryInfo = getMemoryUsage();
    const uptime = os.uptime();

    // Get database stats
    const dbData = await getDatabaseStats();
    const collectionData = await getCollectionStats();
    
    let storageUsed = 0;
    let storageTotal = 1024;
    let indexSize = 0;
    let dataSize = 0;
    
    if (dbData?.stats) {
      storageUsed = Math.round(dbData.stats.dataSize / (1024 * 1024)); // MB
      storageTotal = Math.round(dbData.stats.storageSize / (1024 * 1024)) || 1024; // MB
      indexSize = Math.round((dbData.stats.indexSize || 0) / (1024 * 1024)) || 10; // MB
      dataSize = Math.round((dbData.stats.dataSize || 0) / (1024 * 1024)) || 20; // MB
    }

    // Update history arrays
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    cpuHistory.push({ time: timeString, usage: cpuUsage });
    memoryHistory.push({ time: timeString, usage: memoryInfo.used });
    
    // Keep only the last 24 data points
    if (cpuHistory.length > 24) {
      cpuHistory = cpuHistory.slice(-24);
      memoryHistory = memoryHistory.slice(-24);
    }

    // Calculate network latency (simulated)
    const networkLatency = Math.round(Math.random() * 30 + 20); // 20-50ms
    networkHistory.push({ time: timeString, latency: networkLatency });
    if (networkHistory.length > 24) {
      networkHistory = networkHistory.slice(-24);
    }

    // Calculate document growth
    const documentGrowth = previousDocumentCount > 0 
      ? ((collectionData.totalDocuments - previousDocumentCount) / previousDocumentCount) * 100 
      : 0;
    previousDocumentCount = collectionData.totalDocuments;

    // Get additional data
    const recentIncidents = await getRecentIncidents();
    const sharding = await getShardingInfo();

    const metrics: PerformanceMetrics = {
      cpuUsage: Math.round(cpuUsage),
      memoryUsage: memoryInfo.used,
      databaseStatus,
      uptime: uptime.toString(),
      networkLatency,
      storage: {
        used: storageUsed,
        total: storageTotal,
        breakdown: [
          { type: 'Data', value: dataSize, color: '#10aa50' },
          { type: 'Indexes', value: indexSize, color: '#023430' },
          { type: 'Logs', value: Math.round(storageUsed * 0.1), color: '#12b575' }
        ]
      },
      recentIncidents,
      cpuHistory,
      memoryHistory,
      networkHistory,
      queryPerformance: {
        avgLatency: networkLatency,
        indexHitRatio: Math.round((Math.random() * 5 + 95) * 10) / 10, // 95-100%
        latencyTrend: Math.round((Math.random() * 20 - 10) * 10) / 10, // -10% to +10%
        indexTrend: Math.round((Math.random() * 6 - 3) * 10) / 10 // -3% to +3%
      },
      sharding,
      documentCount: collectionData.totalDocuments,
      documentGrowth: Math.round(documentGrowth * 100) / 100
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getHealthCheck = async (req: Request, res: Response) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const isConnected = connectionState === 1;
    
    res.json({
      success: true,
      database: {
        connected: isConnected,
        state: connectionState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};