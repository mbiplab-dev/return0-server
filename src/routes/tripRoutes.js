// =============================================================================
// TRIP ROUTES (Backend)
// File path: routes/tripRoutes.js
// =============================================================================

import express from 'express';
import { verifyToken } from '../controllers/authController.js';
import {
  createTrip,
  getActiveTrip,
  getCurrentTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  archiveTrip,
  activateTrip,
  completeTrip,
  getTripStats,
  checkActiveTrip
} from '../controllers/tripController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Trip CRUD operations
router.post('/', createTrip);                    // POST /api/trips
router.get('/', getUserTrips);                   // GET /api/trips
router.get('/active', getActiveTrip);            // GET /api/trips/active
router.get('/current', getCurrentTrip);          // GET /api/trips/current
router.get('/check-active', checkActiveTrip);    // GET /api/trips/check-active
router.get('/stats', getTripStats);              // GET /api/trips/stats
router.get('/:tripId', getTripById);             // GET /api/trips/:tripId
router.put('/:tripId', updateTrip);              // PUT /api/trips/:tripId
router.delete('/:tripId', deleteTrip);           // DELETE /api/trips/:tripId

// Trip status management
router.patch('/:tripId/archive', archiveTrip);   // PATCH /api/trips/:tripId/archive
router.patch('/:tripId/activate', activateTrip); // PATCH /api/trips/:tripId/activate
router.patch('/:tripId/complete', completeTrip); // PATCH /api/trips/:tripId/complete

export default router;