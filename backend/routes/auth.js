const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  refreshToken
} = require('../controllers/authController');

const { protect } = require('../middlewares/auth');
const {
  validateUserRegistration,
  validateUserLogin
} = require('../middlewares/validation');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateUserRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, login);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, logout);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/auth/refresh
// @desc    Refresh token
// @access  Private
router.post('/refresh', protect, refreshToken);

module.exports = router;
