// =============================================================================
// TRIP CONTROLLER (Backend)
// File path: controllers/tripController.js
// =============================================================================

import Trip from "../models/trip.js";

// Create a new trip
export const createTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const tripData = req.body;

    // Check if user already has an active trip
    const existingActiveTrip = await Trip.findActiveTrip(userId);
    if (existingActiveTrip) {
      return res.status(409).json({ 
        message: "You already have an active trip. Complete or archive it first." 
      });
    }

    // Create trip with user ID
    const trip = new Trip({
      ...tripData,
      userId
    });

    await trip.save();

    // Log trip creation
    console.log(`Trip created: ${trip.name} by user ${req.user.email} (ID: ${userId})`);

    res.status(201).json({
      message: "Trip created successfully",
      trip
    });

  } catch (error) {
    console.error("Create trip error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Invalid trip data",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({ message: "Server error during trip creation" });
  }
};

// Get user's active trip
export const getActiveTrip = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeTrip = await Trip.findActiveTrip(userId);
    
    if (!activeTrip) {
      return res.status(404).json({ message: "No active trip found" });
    }

    res.status(200).json({
      message: "Active trip retrieved successfully",
      trip: activeTrip
    });

  } catch (error) {
    console.error("Get active trip error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's current trip (based on dates)
export const getCurrentTrip = async (req, res) => {
  try {
    const userId = req.user._id;

    const currentTrip = await Trip.findCurrentTrip(userId);
    
    if (!currentTrip) {
      return res.status(404).json({ message: "No current trip found" });
    }

    res.status(200).json({
      message: "Current trip retrieved successfully",
      trip: currentTrip
    });

  } catch (error) {
    console.error("Get current trip error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all user trips
export const getUserTrips = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 10, page = 1, includeArchived = false } = req.query;

    const query = { 
      userId,
      isArchived: includeArchived === 'true' ? { $in: [true, false] } : false
    };
    
    if (status) {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Trip.countDocuments(query);

    res.status(200).json({
      message: "Trips retrieved successfully",
      trips,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get user trips error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get trip by ID
export const getTripById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tripId } = req.params;

    const trip = await Trip.findOne({ _id: tripId, userId });
    
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json({
      message: "Trip retrieved successfully",
      trip
    });

  } catch (error) {
    console.error("Get trip by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update trip
export const updateTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tripId } = req.params;
    const updateData = req.body;

    // Remove userId from update data to prevent tampering
    delete updateData.userId;

    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    console.log(`Trip updated: ${trip.name} by user ${req.user.email}`);

    res.status(200).json({
      message: "Trip updated successfully",
      trip
    });

  } catch (error) {
    console.error("Update trip error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Invalid trip data",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({ message: "Server error during trip update" });
  }
};

// Delete trip
export const deleteTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tripId } = req.params;

    const trip = await Trip.findOneAndDelete({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    console.log(`Trip deleted: ${trip.name} by user ${req.user.email}`);

    res.status(200).json({
      message: "Trip deleted successfully"
    });

  } catch (error) {
    console.error("Delete trip error:", error);
    res.status(500).json({ message: "Server error during trip deletion" });
  }
};

// Archive trip
export const archiveTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tripId } = req.params;

    const trip = await Trip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await trip.archive();

    res.status(200).json({
      message: "Trip archived successfully",
      trip
    });

  } catch (error) {
    console.error("Archive trip error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Activate trip
export const activateTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tripId } = req.params;

    // Check if user already has an active trip
    const existingActiveTrip = await Trip.findActiveTrip(userId);
    if (existingActiveTrip && existingActiveTrip._id.toString() !== tripId) {
      return res.status(409).json({ 
        message: "You already have an active trip. Complete or archive it first." 
      });
    }

    const trip = await Trip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await trip.activate();

    res.status(200).json({
      message: "Trip activated successfully",
      trip
    });

  } catch (error) {
    console.error("Activate trip error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Complete trip
export const completeTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tripId } = req.params;

    const trip = await Trip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await trip.complete();

    res.status(200).json({
      message: "Trip completed successfully",
      trip
    });

  } catch (error) {
    console.error("Complete trip error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get trip statistics for user
export const getTripStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Trip.getUserTripStats(userId);

    res.status(200).json({
      message: "Trip statistics retrieved successfully",
      stats: stats[0] || { total: 0, statuses: [] }
    });

  } catch (error) {
    console.error("Get trip stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Check if user has active trip (utility endpoint)
export const checkActiveTrip = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeTrip = await Trip.findActiveTrip(userId);
    
    res.status(200).json({
      hasActiveTrip: !!activeTrip,
      activeTrip: activeTrip || null
    });

  } catch (error) {
    console.error("Check active trip error:", error);
    res.status(500).json({ message: "Server error" });
  }
};