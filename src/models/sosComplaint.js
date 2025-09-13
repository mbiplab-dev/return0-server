// =============================================================================
// SOS COMPLAINT MODEL (Backend)
// File path: models/sosComplaint.js
// =============================================================================

import mongoose from 'mongoose';

const sosComplaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Complaint Details
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'missing_person',
      'fire_emergency', 
      'theft_robbery',
      'accident',
      'medical_help',
      'general_help',
      'harassment',
      'fraud',
      'traffic_violation',
      'noise_complaint',
      'other'
    ]
  },
  
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  urgency: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Contact Information
  contactInfo: {
    type: String,
    required: [true, 'Contact information is required'],
    trim: true
  },
  
  alternateContact: {
    type: String,
    trim: true,
    default: null
  },
  
  // Location Information
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    landmark: {
      type: String,
      trim: true,
      default: null
    }
  },
  
  // Additional Information
  additionalInfo: {
    type: String,
    trim: true,
    maxlength: [1000, 'Additional info cannot exceed 1000 characters'],
    default: null
  },
  
  // Attachments
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'audio', 'video']
    },
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status and Assignment
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'assigned',
      'in_progress',
      'resolved',
      'closed',
      'rejected'
    ],
    default: 'submitted',
    index: true
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PoliceOfficer', // We'll create this model later
    default: null
  },
  
  assignedDepartment: {
    type: String,
    enum: [
      'police',
      'fire_department',
      'medical_emergency',
      'traffic_police',
      'tourist_police',
      'cyber_crime',
      'general'
    ],
    default: null
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  
  // Resolution Details
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceOfficer',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Resolution notes cannot exceed 1000 characters'],
      default: null
    },
    actionTaken: {
      type: String,
      trim: true,
      maxlength: [500, 'Action taken cannot exceed 500 characters'],
      default: null
    }
  },
  
  // Communication Log
  communications: [{
    from: {
      type: String,
      enum: ['user', 'officer', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceOfficer',
      default: null
    }
  }],
  
  // Feedback
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  
  // Emergency SOS specific fields
  isEmergencySOS: {
    type: Boolean,
    default: false
  },
  
  sosActivatedAt: {
    type: Date,
    default: null
  },
  
  emergencyResponseTime: {
    type: Number, // Response time in minutes
    default: null
  },
  
  // Metadata
  metadata: {
    deviceInfo: {
      userAgent: String,
      platform: String,
      appVersion: String
    },
    submissionSource: {
      type: String,
      enum: ['mobile_app', 'web_portal', 'phone_call', 'walk_in'],
      default: 'mobile_app'
    },
    ipAddress: String,
    geoLocation: {
      accuracy: Number,
      altitude: Number,
      heading: Number,
      speed: Number
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient queries
sosComplaintSchema.index({ userId: 1, status: 1, createdAt: -1 });
sosComplaintSchema.index({ category: 1, urgency: 1, createdAt: -1 });
sosComplaintSchema.index({ status: 1, assignedDepartment: 1, createdAt: -1 });
sosComplaintSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
sosComplaintSchema.index({ 'location.coordinates': '2dsphere' });
sosComplaintSchema.index({ isEmergencySOS: 1, sosActivatedAt: -1 });
sosComplaintSchema.index({ isDeleted: 1, createdAt: -1 });

// Virtual for complaint ID (formatted)
sosComplaintSchema.virtual('complaintId').get(function() {
  const year = this.createdAt.getFullYear();
  const month = String(this.createdAt.getMonth() + 1).padStart(2, '0');
  const sequence = this._id.toString().slice(-6).toUpperCase();
  return `SOS${year}${month}${sequence}`;
});

// Pre-save middleware
sosComplaintSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-assign priority based on urgency and category
  if (this.isModified('urgency') || this.isModified('category')) {
    if (this.urgency === 'critical' || this.isEmergencySOS) {
      this.priority = 'critical';
    } else if (this.urgency === 'high') {
      this.priority = 'high';
    } else if (this.urgency === 'medium') {
      this.priority = 'normal';
    } else {
      this.priority = 'low';
    }
  }
  
  // Auto-assign department based on category
  if (this.isModified('category')) {
    switch (this.category) {
      case 'fire_emergency':
        this.assignedDepartment = 'fire_department';
        break;
      case 'medical_help':
        this.assignedDepartment = 'medical_emergency';
        break;
      case 'accident':
      case 'traffic_violation':
        this.assignedDepartment = 'traffic_police';
        break;
      case 'theft_robbery':
      case 'harassment':
      case 'fraud':
        this.assignedDepartment = 'police';
        break;
      case 'missing_person':
        this.assignedDepartment = 'tourist_police';
        break;
      default:
        this.assignedDepartment = 'general';
    }
  }
  
  next();
});

// Instance methods
sosComplaintSchema.methods.addCommunication = function(from, message, officerId = null) {
  this.communications.push({
    from,
    message,
    officerId,
    timestamp: new Date()
  });
  return this.save();
};

sosComplaintSchema.methods.updateStatus = function(newStatus, officerId = null, notes = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add status change communication
  this.communications.push({
    from: 'system',
    message: `Status changed from ${oldStatus} to ${newStatus}${notes ? `: ${notes}` : ''}`,
    officerId,
    timestamp: new Date()
  });
  
  return this.save();
};

sosComplaintSchema.methods.assignOfficer = function(officerId, assignedBy = null) {
  this.assignedTo = officerId;
  this.status = 'assigned';
  
  this.communications.push({
    from: 'system',
    message: 'Complaint assigned to officer',
    officerId: assignedBy,
    timestamp: new Date()
  });
  
  return this.save();
};

sosComplaintSchema.methods.resolve = function(officerId, resolutionNotes, actionTaken) {
  this.status = 'resolved';
  this.resolution = {
    resolvedBy: officerId,
    resolvedAt: new Date(),
    resolutionNotes,
    actionTaken
  };
  
  this.communications.push({
    from: 'system',
    message: `Complaint resolved: ${resolutionNotes}`,
    officerId,
    timestamp: new Date()
  });
  
  return this.save();
};

sosComplaintSchema.methods.submitFeedback = function(rating, comment) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  return this.save();
};

// Static methods
sosComplaintSchema.statics.getComplaintStats = function(filters = {}) {
  const matchStage = { isDeleted: false, ...filters };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        byCategory: {
          $push: {
            category: '$category',
            count: 1
          }
        },
        byUrgency: {
          $push: {
            urgency: '$urgency',
            count: 1
          }
        },
        emergencyCount: {
          $sum: { $cond: ['$isEmergencySOS', 1, 0] }
        }
      }
    }
  ]);
};

sosComplaintSchema.statics.getNearbyComplaints = function(longitude, latitude, radiusInMeters = 5000) {
  return this.find({
    isDeleted: false,
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radiusInMeters
      }
    }
  }).populate('userId', 'username email phone');
};

sosComplaintSchema.statics.getComplaintsForDashboard = function(options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    urgency,
    assignedDepartment,
    assignedTo,
    startDate,
    endDate,
    isEmergency,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;
  
  const query = { isDeleted: false };
  
  if (status) query.status = status;
  if (category) query.category = category;
  if (urgency) query.urgency = urgency;
  if (assignedDepartment) query.assignedDepartment = assignedDepartment;
  if (assignedTo) query.assignedTo = assignedTo;
  if (isEmergency !== undefined) query.isEmergencySOS = isEmergency;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  return Promise.all([
    this.find(query)
      .populate('userId', 'username email phone profilePicture')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]).then(([complaints, total]) => ({
    complaints,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }));
};

// Soft delete
sosComplaintSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const SOSComplaint = mongoose.model('SOSComplaint', sosComplaintSchema);

export default SOSComplaint;