// =============================================================================
// NOTIFICATION CONTROLLER (Backend)
// File path: controllers/notificationController.js
// =============================================================================

import Notification from '../models/notification.js';
import User from '../models/user.js';

// Get user notifications with filters and pagination
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 20,
      type,
      category,
      isRead,
      priority,
      includeExpired = false
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      category,
      isRead: isRead !== undefined ? isRead === 'true' : null,
      priority,
      includeExpired: includeExpired === 'true'
    };

    const result = await Notification.getUserNotifications(userId, options);

    res.status(200).json({
      message: 'Notifications retrieved successfully',
      ...result
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notifications',
      error: error.message 
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      message: 'Unread count retrieved successfully',
      count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching unread count',
      error: error.message 
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead();

    res.status(200).json({
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      message: 'Server error while marking notification as read',
      error: error.message 
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const result = await Notification.markAllAsRead(userId);

    res.status(200).json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      message: 'Server error while marking all notifications as read',
      error: error.message 
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting notification',
      error: error.message 
    });
  }
};

// Create notification (for system/admin use)
export const createNotification = async (req, res) => {
  try {
    const {
      userId,
      title,
      message,
      type = 'info',
      category = 'system',
      priority = 'medium',
      hazardType,
      location,
      relatedId,
      relatedType,
      actionRequired = false,
      actionUrl,
      actionText,
      expiresAt,
      metadata = {}
    } = req.body;

    const notificationData = {
      userId,
      title,
      message,
      type,
      category,
      priority,
      hazardType,
      location,
      relatedId,
      relatedType,
      actionRequired,
      actionUrl,
      actionText,
      expiresAt,
      metadata
    };

    const notification = await Notification.create(notificationData);

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      message: 'Server error while creating notification',
      error: error.message 
    });
  }
};

// Create hazard notification
export const createHazardNotification = async (req, res) => {
  try {
    const {
      userId,
      hazardType,
      title,
      message,
      location,
      priority = 'high',
      metadata = {}
    } = req.body;

    const hazardData = {
      title: title || `${hazardType?.charAt(0).toUpperCase() + hazardType?.slice(1)} Alert`,
      message,
      hazardType,
      location,
      priority,
      metadata
    };

    const notification = await Notification.createHazardNotification(userId, hazardData);

    res.status(201).json({
      message: 'Hazard notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create hazard notification error:', error);
    res.status(500).json({ 
      message: 'Server error while creating hazard notification',
      error: error.message 
    });
  }
};

// Create multiple hazard notifications (for multiple users)
export const createBulkHazardNotifications = async (req, res) => {
  try {
    const {
      userIds,
      hazardType,
      title,
      message,
      location,
      priority = 'high',
      metadata = {}
    } = req.body;

    const hazardData = {
      title: title || `${hazardType?.charAt(0).toUpperCase() + hazardType?.slice(1)} Alert`,
      message,
      hazardType,
      location,
      priority,
      metadata
    };

    const notifications = [];
    const errors = [];

    for (const userId of userIds || []) {
      try {
        const notification = await Notification.createHazardNotification(userId, hazardData);
        notifications.push(notification);
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.status(201).json({
      message: 'Bulk hazard notifications processed',
      created: notifications.length,
      errors: errors.length,
      notifications,
      errors
    });

  } catch (error) {
    console.error('Create bulk hazard notifications error:', error);
    res.status(500).json({ 
      message: 'Server error while creating bulk hazard notifications',
      error: error.message 
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      total,
      unread,
      typeStats,
      priorityStats
    ] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.getUnreadCount(userId),
      Notification.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      message: 'Notification statistics retrieved successfully',
      stats: {
        total,
        unread,
        read: total - unread,
        byType: typeStats,
        byPriority: priorityStats
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notification statistics',
      error: error.message 
    });
  }
};

// Cleanup expired notifications (admin/system use)
export const cleanupExpired = async (req, res) => {
  try {
    const result = await Notification.cleanupExpired();

    res.status(200).json({
      message: 'Expired notifications cleaned up',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Cleanup expired notifications error:', error);
    res.status(500).json({ 
      message: 'Server error while cleaning up expired notifications',
      error: error.message 
    });
  }
};