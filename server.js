// =============================================================================
// UPDATED SERVER.JS WITH ZONE ROUTES
// File path: server.js
// =============================================================================

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./src/routes/authRoutes.js";
import tripRoutes from "./src/routes/tripRoutes.js";
import areaRoutes from "./src/routes/areaRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import sosRoutes from "./src/routes/sosRoutes.js";
import authorityRoutes from "./src/routes/authorityRoutes.js";
import touristRoutes from "./src/routes/touristRoutes.js";
import zoneRoutes from "./src/routes/zoneRoutes.js"; // Add zone routes
import { protect } from "./src/middleware/authMiddleware.js";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log("JWT Secret:", process.env.JWT_SECRET ? "Configured" : "Missing");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/trips", protect, tripRoutes);
app.use("/api/notifications", protect, notificationRoutes);
app.use("/api/sos", protect, sosRoutes);
app.use("/api/authority", authorityRoutes);
app.use("/api/tourist-management", touristRoutes);
app.use("/api", zoneRoutes); // Add zone routes
app.use("/api", areaRoutes);

// Protected profile route (example)
app.get("/api/profile", protect, (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
      server: "Running"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Database connection and server start
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📋 Available routes:`);
      console.log(`   - Auth: /api/auth/*`);
      console.log(`   - Trips: /api/trips/*`);
      console.log(`   - Notifications: /api/notifications/*`);
      console.log(`   - SOS Complaints: /api/sos/*`);
      console.log(`   - Authority Dashboard: /api/authority/*`);
      console.log(`   - Tourist Management: /api/tourist-management/*`);
      console.log(`   - Zones: /api/zones`);
      console.log(`   - Areas: /api/*`);
      console.log(`   - Health: /api/health`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});