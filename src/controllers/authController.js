// =============================================================================
// IMPROVED AUTH CONTROLLER (Backend)
// File path: controllers/authController.js
// =============================================================================

import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

// Rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 5 requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      username: user.username 
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Extended to 7 days for better UX
  );
};

// Validation helper
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array()
    });
  }
  return null;
};

// User response formatter (excludes sensitive data)
const formatUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Signup
export const signup = async (req, res) => {
  try {
    // Handle validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const { username, email, password, phone } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { phone: phone || null }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ message: "Email already registered" });
      }
      if (existingUser.phone === phone) {
        return res.status(409).json({ message: "Phone number already registered" });
      }
    }

    // Create new user
    const userData = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
    };

    // Add phone if provided
    if (phone) {
      userData.phone = phone.trim();
    }

    const user = await User.create(userData);
    const token = generateToken(user);

    // Log successful registration
    console.log(`New user registered: ${user.email} (ID: ${user._id})`);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: formatUserResponse(user),
    });

  } catch (error) {
    console.error("Signup error:", error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Invalid user data",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({ message: "Server error during registration" });
  }
};

// Signin (supports both email and phone)
export const signin = async (req, res) => {
  try {
    // Handle validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const { email, phone, password } = req.body;

    // Build query - support login with email or phone
    let query = {};
    if (email) {
      query.email = email.toLowerCase().trim();
    } else if (phone) {
      query.phone = phone.trim();
    } else {
      return res.status(400).json({ message: "Email or phone number required" });
    }

    // Find user and include password for comparison
    const user = await User.findOne(query).select("+password");
    
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    // Log successful login
    console.log(`User login: ${user.email} (ID: ${user._id})`);

    res.status(200).json({
      message: "Login successful",
      token,
      user: formatUserResponse(user),
    });

  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Token verification middleware
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid token. User not found." });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Token verification error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }

    res.status(500).json({ message: "Server error during token verification" });
  }
};

// Verify token endpoint
export const verifyTokenEndpoint = async (req, res) => {
  try {
    // If we reach here, token is valid (middleware passed)
    res.status(200).json({
      message: "Token is valid",
      user: formatUserResponse(req.user)
    });
  } catch (error) {
    console.error("Token verification endpoint error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout (optional - mainly for logging)
export const logout = async (req, res) => {
  try {
    // Log logout
    if (req.user) {
      console.log(`User logout: ${req.user.email} (ID: ${req.user._id})`);
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    res.status(200).json({
      message: "Profile retrieved successfully",
      user: formatUserResponse(req.user)
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { username, phone } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (username) updateData.username = username.trim();
    if (phone) updateData.phone = phone.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: formatUserResponse(user)
    });

  } catch (error) {
    console.error("Update profile error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Invalid data",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({ message: "Server error during profile update" });
  }
};