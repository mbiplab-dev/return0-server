// =============================================================================
// UPDATED SERVER.JS WITH NEW ROUTES
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
import { protect } from "./src/middleware/authMiddleware.js";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

console.log("JWT Secret:", process.env.JWT_SECRET ? "Configured" : "Missing");

// =============================================================================
// API ROUTES
// =============================================================================

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api", areaRoutes); // Public area information

// Protected routes
app.use("/api/trips", protect, tripRoutes);
app.use("/api/notifications", protect, notificationRoutes);
app.use("/api/sos", protect, sosRoutes);

// Authority/Admin protected routes
app.use("/api/authority", authorityRoutes);           // Existing authority dashboard routes
app.use("/api/tourist-management", touristRoutes);   // New tourist ID management routes  
// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Basic profile route (unprotected)
app.get("/api/profile", (req, res) => {
  res.json({ 
    message: "Profile endpoint - authentication disabled for testing",
    note: "In production, this should be protected"
  });
});

// Health check route with detailed status
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
      server: "Running",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      uptime: Math.round(process.uptime()) + ' seconds'
    },
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation route
app.get("/api/docs", (req, res) => {
  res.json({
    message: "SafeGuard Tourist API Documentation",
    version: "1.0.0",
    endpoints: {
      authentication: {
        base: "/api/auth",
        routes: [
          "POST /register - Register new user",
          "POST /login - User login", 
          "POST /logout - User logout",
          "POST /forgot-password - Request password reset",
          "POST /reset-password - Reset password",
          "GET /verify-email/:token - Verify email"
        ]
      },
      trips: {
        base: "/api/trips",
        auth: "Required",
        routes: [
          "GET / - Get user trips",
          "POST / - Create new trip",
          "GET /:id - Get trip details",
          "PUT /:id - Update trip",
          "DELETE /:id - Delete trip"
        ]
      },
      notifications: {
        base: "/api/notifications",
        auth: "Required", 
        routes: [
          "GET / - Get user notifications",
          "POST /mark-read/:id - Mark notification as read",
          "POST /mark-all-read - Mark all notifications as read"
        ]
      },
      sos: {
        base: "/api/sos",
        auth: "Required",
        routes: [
          "POST /submit - Submit SOS complaint",
          "POST /emergency - Submit emergency SOS",
          "GET /complaints - Get user complaints",
          "GET /complaints/:id - Get complaint details",
          "POST /complaints/:id/communication - Add communication",
          "POST /complaints/:id/feedback - Submit feedback"
        ]
      },
      authority: {
        base: "/api/authority",
        auth: "Authority/Admin Required",
        routes: [
          "GET /complaints - Get all complaints with filters",
          "GET /complaints/stats - Get complaint statistics",
          "GET /complaints/:id - Get complaint details",
          "PATCH /complaints/:id/acknowledge - Acknowledge complaint",
          "PATCH /complaints/:id/resolve - Resolve complaint",
          "PATCH /complaints/:id/escalate - Escalate to FIR"
        ]
      },
      touristManagement: {
        base: "/api/tourist-management", 
        auth: "Authority/Admin Required",
        routes: [
          "GET /tourists - Get all tourists with search/filter",
          "GET /tourists/:id - Get tourist profile details",
          "PATCH /tourists/:id - Update tourist profile",
          "PATCH /tourists/:id/flag - Flag/unflag tourist",
          "POST /tourists/:id/location - Track tourist location",
          "GET /statistics/overview - Get tourist statistics"
        ]
      },
      efir: {
        base: "/api/efir",
        auth: "Authority/Admin Required", 
        routes: [
          "GET /cases - Get all E-FIR cases with filters",
          "GET /cases/:id - Get case details",
          "POST /cases - Create new E-FIR case",
          "POST /cases/:id/updates - Add investigation update",
          "PATCH /cases/:id/status - Update case status",
          "GET /cases/:id/export - Export case report",
          "POST /escalate-complaint/:id - Escalate complaint to E-FIR",
          "GET /statistics/overview - Get E-FIR statistics"
        ]
      },
      areas: {
        base: "/api",
        auth: "None",
        routes: [
          "GET /areas - Get area information",
          "GET /areas/:id - Get specific area details"
        ]
      },
      utility: {
        routes: [
          "GET /api/profile - Get user profile (Protected)",
          "GET /api/health - System health check",
          "GET /api/docs - This documentation"
        ]
      }
    }
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: "Validation Error",
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `Duplicate ${field}. This ${field} is already registered.`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    availableRoutes: {
      auth: "/api/auth/*",
      trips: "/api/trips/*", 
      notifications: "/api/notifications/*",
      sos: "/api/sos/*",
      authority: "/api/authority/*",
      touristManagement: "/api/tourist-management/*",
      efir: "/api/efir/*",
      docs: "/api/docs",
      health: "/api/health"
    }
  });
});

// =============================================================================
// DATABASE CONNECTION & SERVER START
// =============================================================================

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📋 Available API endpoints:`);
      console.log(`   - Authentication: /api/auth/*`);
      console.log(`   - User Trips: /api/trips/*`);
      console.log(`   - Notifications: /api/notifications/*`);
      console.log(`   - SOS Complaints: /api/sos/*`);
      console.log(`   - Authority Dashboard: /api/authority/*`);
      console.log(`   - Tourist Management: /api/tourist-management/*`);
      console.log(`   - E-FIR Management: /api/efir/*`);
      console.log(`   - Areas: /api/areas/*`);
      console.log(`   - Documentation: /api/docs`);
      console.log(`   - Health Check: /api/health`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

// =============================================================================
// PROCESS EVENT HANDLERS
// =============================================================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

export default app;