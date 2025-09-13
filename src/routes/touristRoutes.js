// =============================================================================
// TOURIST MANAGEMENT ROUTES
// File path: src/routes/touristRoutes.js
// =============================================================================

import express from 'express';
import User from '../models/user.js';
import SOSComplaint from '../models/sosComplaint.js';
import Notification from '../models/notification.js';

const router = express.Router();

// =============================================================================
// TOURIST PROFILE MANAGEMENT
// =============================================================================

// Get all tourists with advanced filtering and search
router.get('/tourists', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all',
      nationality = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = { status: { $ne: 'deleted' } };
    
    // Search functionality
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'profile.passportNumber': { $regex: search, $options: 'i' } },
        { 'profile.aadhaarNumber': { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    // Nationality filter
    if (nationality) {
      query['profile.nationality'] = nationality;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [tourists, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Enhance tourist data with recent activity
    const enhancedTourists = await Promise.all(
      tourists.map(async (tourist) => {
        const [recentComplaints, lastComplaint] = await Promise.all([
          SOSComplaint.countDocuments({ userId: tourist._id }),
          SOSComplaint.findOne({ userId: tourist._id })
            .sort({ createdAt: -1 })
            .select('location createdAt category status')
            .lean()
        ]);

        return {
          ...tourist,
          stats: {
            totalComplaints: recentComplaints,
            lastComplaint: lastComplaint ? {
              location: lastComplaint.location?.address || 'Unknown',
              timestamp: lastComplaint.createdAt,
              category: lastComplaint.category,
              status: lastComplaint.status
            } : null
          }
        };
      })
    );

    res.status(200).json({
      message: 'Tourists retrieved successfully',
      tourists: enhancedTourists,
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
    console.error('Get tourists error:', error);
    res.status(500).json({
      message: 'Server error while fetching tourists',
      error: error.message
    });
  }
});

// Get single tourist profile with complete details
router.get('/tourists/:touristId', async (req, res) => {
  try {
    const { touristId } = req.params;

    const tourist = await User.findById(touristId)
      .select('-password')
      .lean();

    if (!tourist) {
      return res.status(404).json({ message: 'Tourist not found' });
    }

    // Get tourist's complaints and safety information
    const [complaints, recentActivity, notifications] = await Promise.all([
      SOSComplaint.find({ userId: touristId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      
      SOSComplaint.find({ userId: touristId, status: { $in: ['submitted', 'in_progress'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
        
      Notification.find({ userId: touristId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // Calculate safety score based on complaints and activity
    const safetyScore = calculateSafetyScore(complaints);

    const enhancedProfile = {
      ...tourist,
      safetyInfo: {
        safetyScore,
        totalComplaints: complaints.length,
        activeComplaints: recentActivity.length,
        lastActivity: complaints[0] ? complaints[0].createdAt : null,
        riskLevel: safetyScore < 30 ? 'high' : safetyScore < 70 ? 'medium' : 'low'
      },
      recentComplaints: complaints,
      recentActivity,
      notifications: notifications.slice(0, 5)
    };

    res.status(200).json({
      message: 'Tourist profile retrieved successfully',
      tourist: enhancedProfile
    });

  } catch (error) {
    console.error('Get tourist profile error:', error);
    res.status(500).json({
      message: 'Server error while fetching tourist profile',
      error: error.message
    });
  }
});

// Update tourist profile (authority use)
router.patch('/tourists/:touristId', async (req, res) => {
  try {
    const { touristId } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this route
    delete updates.password;
    delete updates.email; // Email updates require verification

    const tourist = await User.findByIdAndUpdate(
      touristId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!tourist) {
      return res.status(404).json({ message: 'Tourist not found' });
    }

    // Log the update activity
    await createActivityLog(req.user._id, 'tourist_updated', {
      touristId,
      updatedFields: Object.keys(updates),
      timestamp: new Date()
    });

    res.status(200).json({
      message: 'Tourist profile updated successfully',
      tourist
    });

  } catch (error) {
    console.error('Update tourist error:', error);
    res.status(500).json({
      message: 'Server error while updating tourist',
      error: error.message
    });
  }
});

// Flag/unflag tourist
router.patch('/tourists/:touristId/flag', async (req, res) => {
  try {
    const { touristId } = req.params;
    const { flag, reason } = req.body;

    const newStatus = flag ? 'flagged' : 'active';
    
    const tourist = await User.findByIdAndUpdate(
      touristId,
      { 
        status: newStatus,
        'profile.flagReason': flag ? reason : undefined,
        'profile.flaggedBy': flag ? req.user._id : undefined,
        'profile.flaggedAt': flag ? new Date() : undefined
      },
      { new: true }
    ).select('-password');

    if (!tourist) {
      return res.status(404).json({ message: 'Tourist not found' });
    }

    // Create notification for tourist
    await Notification.create({
      userId: touristId,
      title: flag ? 'Account Flagged' : 'Account Flag Removed',
      message: flag 
        ? `Your account has been flagged by authorities. Reason: ${reason}` 
        : 'Your account flag has been removed.',
      type: flag ? 'warning' : 'info',
      category: 'security',
      priority: flag ? 'high' : 'medium'
    });

    res.status(200).json({
      message: `Tourist ${flag ? 'flagged' : 'unflagged'} successfully`,
      tourist
    });

  } catch (error) {
    console.error('Flag tourist error:', error);
    res.status(500).json({
      message: 'Server error while updating tourist status',
      error: error.message
    });
  }
});

// Get tourist statistics
router.get('/statistics/overview', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    if (timeframe !== 'all') {
      const days = parseInt(timeframe.replace('d', ''));
      dateFilter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const [
      totalTourists,
      activeTourists,
      flaggedTourists,
      newRegistrations,
      nationalityStats,
      statusStats,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'flagged' }),
      User.countDocuments(dateFilter),
      
      User.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$profile.nationality', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      User.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      User.find(dateFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('username profile.nationality createdAt status')
        .lean()
    ]);

    res.status(200).json({
      message: 'Tourist statistics retrieved successfully',
      statistics: {
        overview: {
          total: totalTourists,
          active: activeTourists,
          flagged: flaggedTourists,
          newRegistrations
        },
        breakdown: {
          byNationality: nationalityStats.reduce((acc, item) => {
            acc[item._id || 'Unknown'] = item.count;
            return acc;
          }, {}),
          byStatus: statusStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        recentActivity,
        timeframe
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      message: 'Server error while fetching statistics',
      error: error.message
    });
  }
});

// Track tourist location (for safety)
router.post('/tourists/:touristId/location', async (req, res) => {
  try {
    const { touristId } = req.params;
    const { coordinates, address, notes } = req.body;

    const tourist = await User.findById(touristId);
    if (!tourist) {
      return res.status(404).json({ message: 'Tourist not found' });
    }

    // Update last known location
    await User.findByIdAndUpdate(touristId, {
      'profile.lastKnownLocation': {
        coordinates,
        address,
        timestamp: new Date(),
        reportedBy: req.user._id,
        notes
      }
    });

    // Create location tracking log
    await createActivityLog('system', 'location_tracked', {
      touristId,
      location: { coordinates, address },
      timestamp: new Date()
    });

    res.status(200).json({
      message: 'Location tracked successfully',
      location: { coordinates, address, timestamp: new Date() }
    });

  } catch (error) {
    console.error('Track location error:', error);
    res.status(500).json({
      message: 'Server error while tracking location',
      error: error.message
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Calculate safety score based on complaint history
function calculateSafetyScore(complaints) {
  if (!complaints || complaints.length === 0) return 100;

  let score = 100;
  const recentComplaints = complaints.filter(
    c => new Date(c.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  // Reduce score based on complaint count and severity
  score -= recentComplaints.length * 10;
  
  // Further reduce for emergency complaints
  const emergencyComplaints = recentComplaints.filter(c => c.isEmergencySOS);
  score -= emergencyComplaints.length * 20;

  // Reduce for unresolved complaints
  const unresolvedComplaints = recentComplaints.filter(
    c => !['resolved', 'closed'].includes(c.status)
  );
  score -= unresolvedComplaints.length * 15;

  return Math.max(0, Math.min(100, score));
}

// Create activity log for audit trail
async function createActivityLog(userId, action, data) {
  try {
    // You can implement a separate ActivityLog model or add to existing notification system
    await Notification.create({
      userId: null, // System notification
      title: 'Authority Action',
      message: `${action} performed by authority`,
      type: 'system',
      category: 'audit',
      priority: 'low',
      metadata: {
        performedBy: userId,
        action,
        ...data
      }
    });
  } catch (error) {
    console.error('Activity log error:', error);
  }
}

export default router;