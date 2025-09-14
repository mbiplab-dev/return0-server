// =============================================================================
// BACKEND AUTH ROUTES
// File path: routes/authRoutes.js
// =============================================================================

import express from 'express';
import { body } from 'express-validator';
import {
  signup,
  signin,
  logout,
  verifyToken,
  verifyTokenEndpoint,
  getProfile,
  updateProfile,
  authLimiter
} from '../controllers/authController.js';

const router = express.Router();

// Validation middleware
const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const signinValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  // Custom validation to ensure either email or phone is provided
  body().custom((body) => {
    if (!body.email && !body.phone) {
      throw new Error('Either email or phone number is required');
    }
    return true;
  })
];

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_\s]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and spaces'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Auth Routes

// POST /api/auth/signup - Register new user
router.post('/signup', authLimiter, signupValidation, signup);

// POST /api/auth/signin - Login user
router.post('/signin', authLimiter, signinValidation, signin);

// GET /api/auth/verify - Verify JWT token
router.get('/verify', verifyToken, verifyTokenEndpoint);

// POST /api/auth/logout - Logout user (optional, mainly for logging)
router.post('/logout', verifyToken, logout);

// GET /api/auth/profile - Get user profile
router.get('/profile', verifyToken, getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', verifyToken, updateProfileValidation, updateProfile);

export default router;