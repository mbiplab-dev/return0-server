// =============================================================================
// ZONE LOG MODEL
// File path: src/models/zoneLog.js
// =============================================================================

import mongoose from 'mongoose';

const zoneLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  
  action: {
    type: String,
    required: true,
    enum: ['created', 'deleted', 'modified']
  },
  
  zoneName: {
    type: String,
    required: true
  },
  
  officer: {
    type: String,
    required: true,
    default: 'Current Officer'
  },
  
  details: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const ZoneLog = mongoose.model('ZoneLog', zoneLogSchema);

export default ZoneLog;