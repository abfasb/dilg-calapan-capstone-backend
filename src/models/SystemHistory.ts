import mongoose, { Schema } from 'mongoose';

// System History Schema
const SystemHistorySchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  cpu: {
    utilization: Number,
    load1: Number,
    load5: Number,
    load15: Number
  },
  memoryUsage: {
    percentage: Number,
    total: Number,
    used: Number
  },
  mongoStorage: {
    used: Number,
    total: Number,
    percentage: Number,
    collections: Number,
    indexes: Number
  },
  connections: {
    current: Number,
    available: Number,
    active: Number
  },
  uptime: Number,
  os: {
    platform: String,
    version: String
  }
});

export const SystemHistory = mongoose.model('SystemHistory', SystemHistorySchema);

const AlertSchema = new Schema({
  type: { type: String, enum: ['CPU', 'MEMORY', 'STORAGE', 'CONNECTION'], required: true },
  message: { type: String, required: true },
  level: { type: String, enum: ['warning', 'critical'], required: true },
  timestamp: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false }
});

export const Alert = mongoose.model('Alert', AlertSchema);