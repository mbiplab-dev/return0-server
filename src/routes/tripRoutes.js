import expres from 'express';
import { allTrips, createTrip, addMembers, addItinerary } from '../controllers/tripControllers.js';

const router = expres.Router()

// Step 1 - create trip
router.post("/trips", createTrip);

// Step 2 - add members
router.post("/trips/:tripId/members", addMembers);

// Step 3 - add itinerary
router.post("/trips/:tripId/itinerary", addItinerary);

//get list of all trips
router.get("/trips/:userId",allTrips);

export default router;