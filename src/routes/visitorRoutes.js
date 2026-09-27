const express = require('express');
const router = express.Router();
const {
  createOrUpdateMyProfile,
  getMyProfile,
  getAllVisitors,
  searchVisitors,
  getVisitorById,
  deleteVisitor,
} = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Visitor routes (self)
router.post('/profile', protect, authorize('visitor'), createOrUpdateMyProfile);
router.get('/profile/me', protect, authorize('visitor'), getMyProfile);

// Staff routes (Admin and Doctor)
router.get('/search', protect, authorize('admin', 'doctor'), searchVisitors);
router.get('/', protect, authorize('admin', 'doctor'), getAllVisitors);
router.get('/:id', protect, authorize('admin', 'doctor'), getVisitorById);

// Admin-only route
router.delete('/:id', protect, authorize('admin'), deleteVisitor);

module.exports = router;