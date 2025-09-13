// =============================================================================
// AUTHORITY DASHBOARD CONTROLLER - For Police Officers/Authority Personnel
// File path: src/controllers/authorityController.js
// =============================================================================

import SOSComplaint from '../models/sosComplaint.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Get all complaints for authority dashboard (with filtering)
export const getComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      urgency,
      assignedDepartment,
      startDate,
      endDate,
      isEmergency,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isDeleted: false };
    
    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (urgency) query.urgency = urgency;
    if (assignedDepartment) query.assignedDepartment = assignedDepartment;
    if (isEmergency !== undefined) query.isEmergencySOS = isEmergency === 'true';
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { contactInfo: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [complaints, total] = await Promise.all([
      SOSComplaint.find(query)
        .populate('userId', 'username email phone')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SOSComplaint.countDocuments(query)
    ]);

    // Transform complaints to match frontend Alert interface
    const transformedComplaints = complaints.map(complaint => ({
      id: complaint._id,
      complaintId: `SOS${complaint.createdAt.getFullYear()}${String(complaint.createdAt.getMonth() + 1).padStart(2, '0')}${complaint._id.toString().slice(-6).toUpperCase()}`,
      type: mapCategoryToType(complaint.category),
      severity: mapUrgencyToSeverity(complaint.urgency),
      status: mapComplaintStatusToAlertStatus(complaint.status),
      touristId: complaint.userId?._id || 'Unknown',
      touristName: complaint.userId?.username || 'Unknown User',
      touristEmail: complaint.userId?.email,
      touristPhone: complaint.userId?.phone,
      location: complaint.location.address,
      coordinates: complaint.location.coordinates ? {
        lat: complaint.location.coordinates[1],
        lng: complaint.location.coordinates[0]
      } : null,
      timestamp: complaint.createdAt,
      description: complaint.description,
      title: complaint.title,
      contactInfo: complaint.contactInfo,
      reportedBy: complaint.isEmergencySOS ? 'Emergency SOS' : 'Tourist App',
      assignedOfficer: complaint.assignedTo ? 'Officer Assigned' : null,
      assignedDepartment: complaint.assignedDepartment,
      responseTime: complaint.emergencyResponseTime ? `${complaint.emergencyResponseTime} min` : null,
      notes: complaint.resolution?.resolutionNotes,
      isEmergencySOS: complaint.isEmergencySOS,
      sosActivatedAt: complaint.sosActivatedAt,
      communications: complaint.communications,
      feedback: complaint.feedback
    }));

    res.status(200).json({
      message: 'Complaints retrieved successfully',
      complaints: transformedComplaints,
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
    console.error('Get complaints error:', error);
    res.status(500).json({
      message: 'Server error while fetching complaints',
      error: error.message
    });
  }
};

// Get complaint statistics for dashboard
export const getComplaintStats = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const baseQuery = { 
      isDeleted: false,
      createdAt: { $gte: startDate }
    };

    const [
      totalComplaints,
      activeComplaints,
      criticalComplaints,
      emergencyComplaints,
      resolvedComplaints,
      statusBreakdown,
      categoryBreakdown,
      urgencyBreakdown,
      averageResponseTime
    ] = await Promise.all([
      SOSComplaint.countDocuments(baseQuery),
      SOSComplaint.countDocuments({ ...baseQuery, status: { $in: ['submitted', 'under_review', 'assigned', 'in_progress'] } }),
      SOSComplaint.countDocuments({ ...baseQuery, urgency: 'critical' }),
      SOSComplaint.countDocuments({ ...baseQuery, isEmergencySOS: true }),
      SOSComplaint.countDocuments({ ...baseQuery, status: { $in: ['resolved', 'closed'] } }),
      
      // Status breakdown
      SOSComplaint.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Category breakdown
      SOSComplaint.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      
      // Urgency breakdown
      SOSComplaint.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$urgency', count: { $sum: 1 } } }
      ]),
      
      // Average response time calculation
      SOSComplaint.aggregate([
        { 
          $match: { 
            ...baseQuery,
            emergencyResponseTime: { $exists: true, $ne: null }
          } 
        },
        { $group: { _id: null, avgResponseTime: { $avg: '$emergencyResponseTime' } } }
      ])
    ]);

    // Calculate resolution rate
    const resolutionRate = totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1) : 0;

    res.status(200).json({
      message: 'Complaint statistics retrieved successfully',
      timeframe,
      stats: {
        summary: {
          total: totalComplaints,
          active: activeComplaints,
          critical: criticalComplaints,
          emergency: emergencyComplaints,
          resolved: resolvedComplaints,
          resolutionRate: parseFloat(resolutionRate),
          averageResponseTime: averageResponseTime[0]?.avgResponseTime || 0
        },
        breakdown: {
          byStatus: statusBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byCategory: categoryBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byUrgency: urgencyBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({
      message: 'Server error while fetching complaint statistics',
      error: error.message
    });
  }
};

// Get single complaint details
export const getComplaintDetails = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await SOSComplaint.findOne({
      _id: complaintId,
      isDeleted: false
    }).populate('userId', 'username email phone').lean();

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Transform complaint to match frontend interface
    const transformedComplaint = {
      id: complaint._id,
      complaintId: `SOS${complaint.createdAt.getFullYear()}${String(complaint.createdAt.getMonth() + 1).padStart(2, '0')}${complaint._id.toString().slice(-6).toUpperCase()}`,
      type: mapCategoryToType(complaint.category),
      severity: mapUrgencyToSeverity(complaint.urgency),
      status: mapComplaintStatusToAlertStatus(complaint.status),
      touristId: complaint.userId?._id || 'Unknown',
      touristName: complaint.userId?.username || 'Unknown User',
      touristEmail: complaint.userId?.email,
      touristPhone: complaint.userId?.phone,
      location: complaint.location.address,
      coordinates: complaint.location.coordinates ? {
        lat: complaint.location.coordinates[1],
        lng: complaint.location.coordinates[0]
      } : null,
      timestamp: complaint.createdAt,
      description: complaint.description,
      title: complaint.title,
      contactInfo: complaint.contactInfo,
      reportedBy: complaint.isEmergencySOS ? 'Emergency SOS' : 'Tourist App',
      assignedOfficer: complaint.assignedTo ? 'Officer Assigned' : null,
      assignedDepartment: complaint.assignedDepartment,
      responseTime: complaint.emergencyResponseTime ? `${complaint.emergencyResponseTime} min` : null,
      notes: complaint.resolution?.resolutionNotes,
      isEmergencySOS: complaint.isEmergencySOS,
      sosActivatedAt: complaint.sosActivatedAt,
      communications: complaint.communications,
      feedback: complaint.feedback,
      additionalInfo: complaint.additionalInfo,
      attachments: complaint.attachments,
      metadata: complaint.metadata
    };

    res.status(200).json({
      message: 'Complaint details retrieved successfully',
      complaint: transformedComplaint
    });

  } catch (error) {
    console.error('Get complaint details error:', error);
    res.status(500).json({
      message: 'Server error while fetching complaint details',
      error: error.message
    });
  }
};

// Acknowledge complaint (authority marks it as acknowledged)
export const acknowledgeComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { officerName, notes } = req.body;

    const complaint = await SOSComplaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Update status to under_review (acknowledged)
    await complaint.updateStatus('under_review', null, `Acknowledged by ${officerName || 'Authority'}${notes ? `: ${notes}` : ''}`);

    // Create notification for user
    await Notification.create({
      userId: complaint.userId,
      title: 'Complaint Acknowledged',
      message: `Your help request has been acknowledged by authorities and is being reviewed.`,
      type: 'info',
      category: 'safety',
      priority: 'medium',
      relatedId: complaint._id.toString(),
      relatedType: 'sos_complaint',
      metadata: {
        complaintId: complaint._id,
        acknowledgedBy: officerName
      }
    });

    res.status(200).json({
      message: 'Complaint acknowledged successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status
      }
    });

  } catch (error) {
    console.error('Acknowledge complaint error:', error);
    res.status(500).json({
      message: 'Server error while acknowledging complaint',
      error: error.message
    });
  }
};

// Resolve complaint
export const resolveComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { officerName, resolutionNotes, actionTaken } = req.body;

    if (!resolutionNotes) {
      return res.status(400).json({ message: 'Resolution notes are required' });
    }

    const complaint = await SOSComplaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Resolve the complaint
    await complaint.resolve(null, resolutionNotes, actionTaken || 'Issue resolved by authority');

    // Create notification for user
    await Notification.create({
      userId: complaint.userId,
      title: 'Complaint Resolved',
      message: `Your help request has been resolved. Please provide feedback on the resolution.`,
      type: 'success',
      category: 'safety',
      priority: 'medium',
      actionRequired: true,
      actionUrl: `/sos/${complaint._id}/feedback`,
      actionText: 'Provide Feedback',
      relatedId: complaint._id.toString(),
      relatedType: 'sos_complaint',
      metadata: {
        complaintId: complaint._id,
        resolvedBy: officerName
      }
    });

    res.status(200).json({
      message: 'Complaint resolved successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        resolution: complaint.resolution
      }
    });

  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({
      message: 'Server error while resolving complaint',
      error: error.message
    });
  }
};

// Escalate complaint to FIR
export const escalateToFIR = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { officerName, escalationNotes, firNumber } = req.body;

    const complaint = await SOSComplaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Update status and add escalation info
    complaint.status = 'escalated';
    complaint.metadata = {
      ...complaint.metadata,
      escalatedToFIR: true,
      firNumber: firNumber || `FIR${Date.now()}`,
      escalatedBy: officerName,
      escalationDate: new Date(),
      escalationNotes
    };

    await complaint.save();

    // Add communication log
    await complaint.addCommunication('system', `Complaint escalated to FIR${firNumber ? ` (${firNumber})` : ''} by ${officerName || 'Authority'}${escalationNotes ? `: ${escalationNotes}` : ''}`);

    // Create notification for user
    await Notification.create({
      userId: complaint.userId,
      title: 'Complaint Escalated to FIR',
      message: `Your complaint has been escalated to an official FIR case for further investigation.`,
      type: 'info',
      category: 'safety',
      priority: 'high',
      relatedId: complaint._id.toString(),
      relatedType: 'fir_case',
      metadata: {
        complaintId: complaint._id,
        firNumber: complaint.metadata.firNumber,
        escalatedBy: officerName
      }
    });

    res.status(200).json({
      message: 'Complaint escalated to FIR successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        firNumber: complaint.metadata.firNumber
      }
    });

  } catch (error) {
    console.error('Escalate to FIR error:', error);
    res.status(500).json({
      message: 'Server error while escalating complaint to FIR',
      error: error.message
    });
  }
};

// Add communication to complaint from authority side
export const addComplaintCommunication = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { message, officerName } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const complaint = await SOSComplaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    await complaint.addCommunication('officer', message, null);

    // Create notification for user
    await Notification.create({
      userId: complaint.userId,
      title: 'Message from Authority',
      message: `You have received a message regarding your help request: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      type: 'info',
      category: 'safety',
      priority: 'medium',
      relatedId: complaint._id.toString(),
      relatedType: 'sos_complaint',
      metadata: {
        complaintId: complaint._id,
        officerName
      }
    });

    res.status(200).json({
      message: 'Communication added successfully',
      communication: {
        from: 'officer',
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

// Get nearby complaints (for map view)
export const getNearbyComplaints = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const complaints = await SOSComplaint.getNearbyComplaints(
      parseFloat(lng), 
      parseFloat(lat), 
      parseInt(radius)
    );

    const transformedComplaints = complaints.map(complaint => ({
      id: complaint._id,
      type: mapCategoryToType(complaint.category),
      severity: mapUrgencyToSeverity(complaint.urgency),
      status: mapComplaintStatusToAlertStatus(complaint.status),
      touristName: complaint.userId?.username || 'Unknown User',
      location: complaint.location.address,
      coordinates: {
        lat: complaint.location.coordinates[1],
        lng: complaint.location.coordinates[0]
      },
      timestamp: complaint.createdAt,
      isEmergencySOS: complaint.isEmergencySOS
    }));

    res.status(200).json({
      message: 'Nearby complaints retrieved successfully',
      complaints: transformedComplaints
    });

  } catch (error) {
    console.error('Get nearby complaints error:', error);
    res.status(500).json({
      message: 'Server error while fetching nearby complaints',
      error: error.message
    });
  }
};

// Helper function to map complaint category to alert type
function mapCategoryToType(category) {
  const mapping = {
    'missing_person': 'lost_tourist',
    'fire_emergency': 'emergency',
    'theft_robbery': 'theft',
    'accident': 'accident',
    'medical_help': 'medical_emergency',
    'general_help': 'panic_button',
    'harassment': 'suspicious_activity',
    'fraud': 'suspicious_activity',
    'traffic_violation': 'accident',
    'noise_complaint': 'suspicious_activity',
    'other': 'panic_button'
  };
  return mapping[category] || 'panic_button';
}

// Helper function to map urgency to severity
function mapUrgencyToSeverity(urgency) {
  const mapping = {
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'critical'
  };
  return mapping[urgency] || 'medium';
}

// Helper function to map complaint status to alert status
function mapComplaintStatusToAlertStatus(status) {
  const mapping = {
    'submitted': 'active',
    'under_review': 'acknowledged',
    'assigned': 'acknowledged',
    'in_progress': 'acknowledged',
    'resolved': 'resolved',
    'closed': 'resolved',
    'rejected': 'resolved',
    'escalated': 'escalated'
  };
  return mapping[status] || 'active';
}

export default {
  getComplaints,
  getComplaintStats,
  getComplaintDetails,
  acknowledgeComplaint,
  resolveComplaint,
  escalateToFIR,
  addComplaintCommunication,
  getNearbyComplaints
};