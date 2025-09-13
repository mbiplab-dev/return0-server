// =============================================================================
// AUTHORITY ROUTES - For Police Officers/Authority Dashboard
// File path: src/routes/authorityRoutes.js
// =============================================================================

import express from 'express';
import authorityController from '../controllers/authorityController.js';

const router = express.Router();

// GET /api/authority/complaints - Get all complaints with filtering
router.get('/complaints', authorityController.getComplaints);

// GET /api/authority/complaints/stats - Get complaint statistics for dashboard
router.get('/complaints/stats', authorityController.getComplaintStats);

// GET /api/authority/complaints/nearby - Get nearby complaints for map view
router.get('/complaints/nearby', authorityController.getNearbyComplaints);

// GET /api/authority/complaints/:complaintId - Get specific complaint details
router.get('/complaints/:complaintId', authorityController.getComplaintDetails);

// PATCH /api/authority/complaints/:complaintId/acknowledge - Acknowledge complaint
router.patch('/complaints/:complaintId/acknowledge', authorityController.acknowledgeComplaint);

// PATCH /api/authority/complaints/:complaintId/resolve - Resolve complaint
router.patch('/complaints/:complaintId/resolve', authorityController.resolveComplaint);

// PATCH /api/authority/complaints/:complaintId/escalate - Escalate complaint to FIR
router.patch('/complaints/:complaintId/escalate', authorityController.escalateToFIR);

// POST /api/authority/complaints/:complaintId/communication - Add communication
router.post('/complaints/:complaintId/communication', authorityController.addComplaintCommunication);

export default router;