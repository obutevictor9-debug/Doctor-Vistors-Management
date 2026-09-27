const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getDoctorDashboard,
  getVisitorDashboard,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/admin', protect, authorize('admin'), getAdminDashboard);
router.get('/doctor', protect, authorize('doctor'), getDoctorDashboard);
router.get('/visitor', protect, authorize('visitor'), getVisitorDashboard);

module.exports = router;