// =============================================================================
// SOS COMPLAINT ROUTES (Backend)
// File path: src/routes/sosRoutes.js
// =============================================================================

import express from 'express';
import sosComplaintController from '../controllers/sosComplaintController.js';

const router = express.Router();

// Submit new SOS complaint/help request
router.post('/submit', sosComplaintController.submitComplaint);

// Get user's complaints
router.get('/', sosComplaintController.getUserComplaints);

// Get specific complaint details
router.get('/:complaintId', sosComplaintController.getComplaintDetails);

// Add communication to complaint
router.post('/:complaintId/communication', sosComplaintController.addCommunication);

// Submit feedback for resolved complaint
router.post('/:complaintId/feedback', sosComplaintController.submitFeedback);

// Get user complaint statistics
router.get('/stats/user', sosComplaintController.getUserComplaintStats);

// Cancel complaint (only if in submitted status)
router.patch('/:complaintId/cancel', sosComplaintController.cancelComplaint);

// Emergency SOS activation (special route for immediate emergency)
router.post('/emergency', sosComplaintController.submitEmergencyComplaint);

export default router;