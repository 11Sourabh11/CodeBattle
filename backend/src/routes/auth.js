import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyToken,
  getUserProfile,
  searchUsers
} from '../controllers/authController.js';
import { verifyToken as authMiddleware, optionalAuth } from '../middleware/auth.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateObjectId
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/forgot-password', validatePasswordReset, requestPasswordReset);
router.post('/reset-password', validatePasswordResetConfirm, resetPassword);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validateUserUpdate, updateProfile);
router.post('/change-password', authMiddleware, changePassword);
router.get('/verify', authMiddleware, verifyToken);

// Public user routes
router.get('/users/search', optionalAuth, searchUsers);
router.get('/users/:userId', validateObjectId('userId'), getUserProfile);

export default router;