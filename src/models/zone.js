// =============================================================================
// ZONE MODEL
// File path: src/models/zone.js
// =============================================================================

import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  coordinates: [{
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  }],
  
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  createdBy: {
    type: String,
    required: true,
    default: 'Current Officer'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Zone = mongoose.model('Zone', zoneSchema);

export default Zone;