import Trip from '../models/trip.js';
import User from '../models/user.js';


// new trip
export const createTrip = async (req, res) => {
  try {
    const { tripName, destination, startDate, endDate, description, createdBy } = req.body;

    const user = await User.findById(createdBy);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const trip = new Trip({
      tripName,
      destination,
      startDate,
      endDate,
      description,
      createdBy,
      members: [],
      itinerary: []
    });

    const savedTrip = await trip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// add member 
export const addMembers = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { members } = req.body; // should be array of members

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    trip.members.push(...members); // add multiple members at once
    const updatedTrip = await trip.save();

    res.status(200).json(updatedTrip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add itinerary to existing trip
export const addItinerary = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { itinerary } = req.body; // should be array of itinerary items

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    trip.itinerary.push(...itinerary);
    const updatedTrip = await trip.save();

    res.status(200).json(updatedTrip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// get all trips for a user
export const allTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ createdBy: req.params.userId }).populate('createdBy');
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
