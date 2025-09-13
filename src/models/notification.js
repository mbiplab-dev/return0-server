// =============================================================================
// NOTIFICATION MODEL (Backend)
// File path: models/notification.js
// =============================================================================

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: ['info', 'warning', 'success', 'emergency', 'health', 'safety', 'travel', 'weather', 'alert'],
    default: 'info'
  },
  
  category: {
    type: String,
    enum: ['safety', 'group', 'health', 'emergency', 'travel', 'weather', 'system'],
    default: 'system'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // Hazard-related fields
  hazardType: {
    type: String,
    enum: ['landslide', 'sachet', 'weather', 'restricted_area', 'emergency', 'other'],
    default: null
  },
  
  location: {
    type: {
      type: String,
      default: null
    },
    coordinates: {
      type: [Number],
      default: null
    },
    address: {
      type: String,
      trim: true,
      default: null
    }
  },
  
  // Related data
  relatedId: {
    type: String,
    default: null
  },
  
  relatedType: {
    type: String,
    default: null
  },
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  // Action-related fields
  actionRequired: {
    type: Boolean,
    default: false
  },
  
  actionUrl: {
    type: String,
    default: null
  },
  
  actionText: {
    type: String,
    default: null
  },
  
  // Expiration (for temporary notifications)
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Delivery status
  deliveryStatus: {
    push: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
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

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to update updatedAt
notificationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create hazard notification
notificationSchema.statics.createHazardNotification = async function(userId, hazardData) {
  const notificationData = {
    userId,
    title: hazardData.title || 'Hazard Alert',
    message: hazardData.message,
    type: 'warning',
    category: 'safety',
    priority: hazardData.priority || 'high',
    hazardType: hazardData.hazardType,
    location: hazardData.location,
    metadata: hazardData.metadata || {}
  };

  if (hazardData.hazardType === 'emergency') {
    notificationData.type = 'emergency';
    notificationData.priority = 'critical';
  }

  return await this.create(notificationData);
};

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    category = null,
    isRead = null,
    priority = null,
    includeExpired = false
  } = options;

  const query = { userId };

  if (type) query.type = type;
  if (category) query.category = category;
  if (isRead !== null) query.isRead = isRead;
  if (priority) query.priority = priority;
  
  if (!includeExpired) {
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    userId,
    isRead: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { 
      $set: { 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date()
      } 
    }
  );
};

// Static method to clean up expired notifications
notificationSchema.statics.cleanupExpired = async function() {
  return await this.deleteMany({
    expiresAt: { $lte: new Date() }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;