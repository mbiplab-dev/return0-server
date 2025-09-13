// =============================================================================
// TRIP MODEL (Backend)
// File path: models/trip.js
// =============================================================================

import mongoose from 'mongoose';

const phoneNumberSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['primary', 'emergency', 'other'],
    default: 'primary'
  }
}, { _id: false });

const tripMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 120
  },
  documentType: {
    type: String,
    required: true,
    enum: ['aadhar', 'passport'],
    default: 'aadhar'
  },
  documentNumber: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumbers: [phoneNumberSchema],
  speciallyAbled: {
    type: Boolean,
    default: false
  },
  specialNeeds: {
    type: String,
    default: ''
  },
  emergencyContact: {
    type: String,
    default: ''
  },
  relation: {
    type: String,
    default: ''
  }
}, { _id: true });

const tripItinerarySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  activities: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    default: ''
  }
}, { _id: true });

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  members: [tripMemberSchema],
  itinerary: [tripItinerarySchema],
  status: {
    type: String,
    enum: ['planned', 'active', 'completed', 'cancelled'],
    default: 'planned'
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Format dates for frontend
      if (ret.startDate) {
        ret.startDate = ret.startDate.toISOString().split('T')[0];
      }
      if (ret.endDate) {
        ret.endDate = ret.endDate.toISOString().split('T')[0];
      }
      return ret;
    }
  }
});

// Compound indexes for better query performance
tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ userId: 1, startDate: 1 });

// Virtual to check if trip is currently active based on dates
tripSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  return startDate <= today && endDate >= today;
});

// Pre-save middleware to auto-set status based on dates
tripSchema.pre('save', function(next) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  // Auto-set status based on dates if not manually set
  if (this.status === 'planned') {
    if (startDate <= today && endDate >= today) {
      this.status = 'active';
    } else if (endDate < today) {
      this.status = 'completed';
    }
  }
  
  next();
});

// Static method to find user's active trip
tripSchema.statics.findActiveTrip = function(userId) {
  return this.findOne({ 
    userId,
    status: 'planned',
    isArchived: false
  });
};

// Static method to find user's current trip (based on dates)
tripSchema.statics.findCurrentTrip = function(userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return this.findOne({ 
    userId,
    startDate: { $lte: today },
    endDate: { $gte: today },
    status: { $in: ['planned', 'active'] },
    isArchived: false
  });
};

// Static method to get user's trip stats
tripSchema.statics.getUserTripStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isArchived: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        statuses: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

// Instance method to archive trip
tripSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Instance method to activate trip
tripSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

// Instance method to complete trip
tripSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;