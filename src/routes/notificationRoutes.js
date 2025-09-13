// =============================================================================
// NOTIFICATION ROUTES (Backend)
// File path: routes/notificationRoutes.js
// =============================================================================

import express from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createHazardNotification,
  createBulkHazardNotifications,
  getNotificationStats,
  cleanupExpired
} from '../controllers/notificationController.js';

const router = express.Router();

// GET /api/notifications - Get user notifications with filters
router.get('/', getUserNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', getUnreadCount);

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', getNotificationStats);

// PATCH /api/notifications/:notificationId/read - Mark notification as read
router.patch('/:notificationId/read', markAsRead);

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// DELETE /api/notifications/:notificationId - Delete notification
router.delete('/:notificationId', deleteNotification);

// POST /api/notifications - Create notification (system/admin use)
router.post('/', createNotification);

// POST /api/notifications/hazard - Create hazard notification
router.post('/hazard', createHazardNotification);

// POST /api/notifications/hazard/bulk - Create bulk hazard notifications
router.post('/hazard/bulk', createBulkHazardNotifications);

// DELETE /api/notifications/cleanup - Cleanup expired notifications (admin)
router.delete('/cleanup', cleanupExpired);

export default router;