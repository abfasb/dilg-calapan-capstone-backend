import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';

export const getSystemMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ensure the database connection is established
    if (!mongoose.connection.db) {
      res.status(500).json({ error: 'Database connection not available' });
      return
    }

    const dbStats = await mongoose.connection.db.stats();
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    const load = os.loadavg();
    const memory = {
      total: os.totalmem(),
      free: os.freemem()
    };
    
    const connections = {
      active: mongoose.connections.length,
      mongo: mongoose.connection.readyState
    };

    res.json({
      mongo: {
        collections: collections.length,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes,
        indexSize: dbStats.indexSize
      },
      system: {
        cpu: {
          load: load.map(l => l.toFixed(2)),
          cores: os.cpus().length
        },
        memory: {
          used: memory.total - memory.free,
          total: memory.total
        }
      },
      connections
    });
  } catch (error) {
    res.status(500).json({ error: 'Monitoring failed', details: (error as Error).message });
  }
};

export const performMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!mongoose.connection.db) {
      res.status(500).json({ error: 'Database connection not available' });
      return
    }

    await mongoose.connection.db.command({ compact: 'yourCollection' });
    await mongoose.connection.db.command({ repairDatabase: 1 });
    
    res.json({ success: true, message: 'Maintenance completed' });
  } catch (error) {
    res.status(500).json({ error: 'Maintenance failed', details: (error as Error).message });
  }
};

export const getSlowQueries = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!mongoose.connection.db) {
      res.status(500).json({ error: 'Database connection not available' });
      return
    }

    const result = await mongoose.connection.db.command({
      profile: -1,
      slowms: 100
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get slow queries', details: (error as Error).message });
  }
};
