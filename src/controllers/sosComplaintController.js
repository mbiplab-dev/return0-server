// =============================================================================
// UPDATED SOS COMPLAINT CONTROLLER - Simplified Validation
// File path: controllers/sosComplaintController.js
// =============================================================================

import SOSComplaint from '../models/sosComplaint.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Submit a new SOS complaint/help request
export const submitComplaint = async (req, res) => {
  try {
    const userId = req.user._id;
    const complaintData = {
      userId,
      ...req.body,
      metadata: {
        ...req.body.metadata,
        submissionSource: 'mobile_app',
        ipAddress: req.ip,
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          platform: req.get('X-Platform') || 'unknown',
          appVersion: req.get('X-App-Version') || '1.0.0'
        }
      }
    };

    // Set SOS activation time if emergency
    if (complaintData.isEmergencySOS) {
      complaintData.sosActivatedAt = new Date();
    }

    // Create the complaint
    const complaint = await SOSComplaint.create(complaintData);

    // Create notification for user
    await createComplaintNotification(userId, complaint, 'submitted');

    // If it's an emergency SOS, create high priority notification
    if (complaintData.isEmergencySOS) {
      await Notification.create({
        userId,
        title: 'Emergency SOS Activated',
        message: 'Your emergency SOS has been activated. Emergency services have been notified and help is on the way.',
        type: 'emergency',
        category: 'emergency',
        priority: 'critical',
        relatedId: complaint._id.toString(),
        relatedType: 'sos_complaint',
        metadata: {
          complaintId: complaint._id,
          category: complaint.category,
          urgency: complaint.urgency
        }
      });
    }

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: {
        id: complaint._id,
        complaintId: complaint.complaintId,
        category: complaint.category,
        title: complaint.title,
        urgency: complaint.urgency,
        status: complaint.status,
        createdAt: complaint.createdAt,
        isEmergencySOS: complaint.isEmergencySOS
      }
    });

  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({
      message: 'Server error while submitting complaint',
      error: error.message
    });
  }
};

// Submit emergency SOS complaint (immediate critical help)
export const submitEmergencyComplaint = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user info for emergency contact
    const user = await User.findById(userId).select('username email phone');
    
    const emergencyData = {
      userId,
      category: 'general_help',
      title: 'Emergency SOS Alert',
      description: req.body.description || 'Emergency SOS activated - immediate assistance required',
      urgency: 'critical',
      contactInfo: user.phone || user.email,
      location: {
        address: req.body.location?.address || 'Location detected via GPS',
        coordinates: req.body.location?.coordinates || null,
        landmark: req.body.location?.landmark || null
      },
      isEmergencySOS: true,
      sosActivatedAt: new Date(),
      metadata: {
        submissionSource: 'emergency_sos',
        ipAddress: req.ip,
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          platform: req.get('X-Platform') || 'unknown',
          appVersion: req.get('X-App-Version') || '1.0.0'
        },
        ...req.body.metadata
      }
    };

    // Create the emergency complaint
    const complaint = await SOSComplaint.create(emergencyData);

    // Create critical notification
    await Notification.create({
      userId,
      title: 'EMERGENCY SOS ACTIVATED',
      message: 'Emergency services have been contacted. Help is on the way. Stay calm and stay on the line.',
      type: 'emergency',
      category: 'emergency',
      priority: 'critical',
      relatedId: complaint._id.toString(),
      relatedType: 'emergency_sos',
      metadata: {
        complaintId: complaint._id,
        sosActivatedAt: complaint.sosActivatedAt,
        emergencyLevel: 'critical'
      }
    });

    res.status(201).json({
      message: 'Emergency SOS activated successfully',
      complaint: {
        id: complaint._id,
        complaintId: complaint.complaintId,
        status: complaint.status,
        sosActivatedAt: complaint.sosActivatedAt,
        emergencyResponseETA: '5-8 minutes'
      }
    });

  } catch (error) {
    console.error('Submit emergency complaint error:', error);
    res.status(500).json({
      message: 'Server error while activating emergency SOS',
      error: error.message
    });
  }
};

// Get user's complaints
export const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      status,
      category,
      urgency,
      startDate,
      endDate
    } = req.query;

    const query = { userId, isDeleted: false };
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (urgency) query.urgency = urgency;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      SOSComplaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-communications -metadata')
        .lean(),
      SOSComplaint.countDocuments(query)
    ]);

    res.status(200).json({
      message: 'Complaints retrieved successfully',
      complaints: complaints.map(complaint => ({
        ...complaint,
        complaintId: `SOS${complaint.createdAt.getFullYear()}${String(complaint.createdAt.getMonth() + 1).padStart(2, '0')}${complaint._id.toString().slice(-6).toUpperCase()}`
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({
      message: 'Server error while fetching complaints',
      error: error.message
    });
  }
};

// Get complaint details
export const getComplaintDetails = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const userId = req.user._id;

    const complaint = await SOSComplaint.findOne({
      _id: complaintId,
      userId,
      isDeleted: false
    }).lean();

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.status(200).json({
      message: 'Complaint details retrieved successfully',
      complaint: {
        ...complaint,
        complaintId: `SOS${complaint.createdAt.getFullYear()}${String(complaint.createdAt.getMonth() + 1).padStart(2, '0')}${complaint._id.toString().slice(-6).toUpperCase()}`
      }
    });

  } catch (error) {
    console.error('Get complaint details error:', error);
    res.status(500).json({
      message: 'Server error while fetching complaint details',
      error: error.message
    });
  }
};

// Add communication to complaint
export const addCommunication = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const userId = req.user._id;
    const { message } = req.body;

    const complaint = await SOSComplaint.findOne({
      _id: complaintId,
      userId,
      isDeleted: false
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    await complaint.addCommunication('user', message);

    res.status(200).json({
      message: 'Communication added successfully',
      communication: {
        from: 'user',
        message: message,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Add communication error:', error);
    res.status(500).json({
      message: 'Server error while adding communication',
      error: error.message
    });
  }
};

// Submit feedback for resolved complaint
export const submitFeedback = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const userId = req.user._id;
    const { rating, comment } = req.body;

    const complaint = await SOSComplaint.findOne({
      _id: complaintId,
      userId,
      status: { $in: ['resolved', 'closed'] },
      isDeleted: false
    });

    if (!complaint) {
      return res.status(404).json({ 
        message: 'Complaint not found or not eligible for feedback' 
      });
    }

    if (complaint.feedback.rating) {
      return res.status(400).json({ 
        message: 'Feedback has already been submitted for this complaint' 
      });
    }

    await complaint.submitFeedback(rating, comment);

    res.status(200).json({
      message: 'Feedback submitted successfully',
      feedback: {
        rating,
        comment,
        submittedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      message: 'Server error while submitting feedback',
      error: error.message
    });
  }
};

// Get complaint statistics for user
export const getUserComplaintStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      total,
      byStatus,
      byCategory,
      byUrgency,
      emergencyCount,
      resolvedCount,
      averageRating
    ] = await Promise.all([
      SOSComplaint.countDocuments({ userId, isDeleted: false }),
      
      SOSComplaint.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      SOSComplaint.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      
      SOSComplaint.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: '$urgency', count: { $sum: 1 } } }
      ]),
      
      SOSComplaint.countDocuments({ userId, isEmergencySOS: true, isDeleted: false }),
      
      SOSComplaint.countDocuments({ 
        userId, 
        status: { $in: ['resolved', 'closed'] }, 
        isDeleted: false 
      }),
      
      SOSComplaint.aggregate([
        { 
          $match: { 
            userId, 
            'feedback.rating': { $exists: true },
            isDeleted: false 
          } 
        },
        { $group: { _id: null, avgRating: { $avg: '$feedback.rating' } } }
      ])
    ]);

    res.status(200).json({
      message: 'User complaint statistics retrieved successfully',
      stats: {
        total,
        resolved: resolvedCount,
        emergency: emergencyCount,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byUrgency: byUrgency.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        averageRating: averageRating[0]?.avgRating || 0
      }
    });

  } catch (error) {
    console.error('Get user complaint stats error:', error);
    res.status(500).json({
      message: 'Server error while fetching complaint statistics',
      error: error.message
    });
  }
};

// Cancel complaint (only if in submitted status)
export const cancelComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const complaint = await SOSComplaint.findOne({
      _id: complaintId,
      userId,
      status: 'submitted',
      isDeleted: false
    });

    if (!complaint) {
      return res.status(404).json({ 
        message: 'Complaint not found or cannot be cancelled' 
      });
    }

    await complaint.updateStatus('closed', null, `Cancelled by user: ${reason || 'No reason provided'}`);

    res.status(200).json({
      message: 'Complaint cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel complaint error:', error);
    res.status(500).json({
      message: 'Server error while cancelling complaint',
      error: error.message
    });
  }
};

// Helper function to create notifications for complaint events
const createComplaintNotification = async (userId, complaint, eventType) => {
  try {
    let notificationData = {
      userId,
      relatedId: complaint._id.toString(),
      relatedType: 'sos_complaint',
      metadata: {
        complaintId: complaint._id,
        category: complaint.category,
        urgency: complaint.urgency,
        eventType
      }
    };

    switch (eventType) {
      case 'submitted':
        notificationData = {
          ...notificationData,
          title: 'Help Request Submitted',
          message: `Your ${complaint.category.replace('_', ' ')} request has been submitted successfully.`,
          type: complaint.urgency === 'critical' ? 'emergency' : 'info',
          category: 'safety',
          priority: complaint.urgency === 'critical' ? 'critical' : 'medium'
        };
        break;

      case 'status_updated':
        notificationData = {
          ...notificationData,
          title: 'Request Status Updated',
          message: `Your help request status: ${complaint.status.replace('_', ' ').toUpperCase()}`,
          type: 'info',
          category: 'safety',
          priority: 'medium'
        };
        break;

      case 'resolved':
        notificationData = {
          ...notificationData,
          title: 'Request Resolved',
          message: `Your help request has been resolved. Please provide feedback.`,
          type: 'success',
          category: 'safety',
          priority: 'medium',
          actionRequired: true,
          actionUrl: `/sos/${complaint._id}/feedback`,
          actionText: 'Provide Feedback'
        };
        break;

      default:
        return;
    }

    await Notification.create(notificationData);
  } catch (error) {
    console.error('Error creating complaint notification:', error);
  }
};

export default {
  submitComplaint,
  submitEmergencyComplaint,
  getUserComplaints,
  getComplaintDetails,
  addCommunication,
  submitFeedback,
  getUserComplaintStats,
  cancelComplaint
};