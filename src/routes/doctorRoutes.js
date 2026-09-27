const express = require('express');
const router = express.Router();
const {
  adminCreateDoctor,
  updateDoctorProfile,
  getMyDoctorProfile,
  getAllDoctors,
  getDoctorById,
  adminDeleteDoctor,
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (Visitors can browse doctors)
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

// Doctor routes (Doctor manages their own profile & schedule)
router.get('/profile/me', protect, authorize('doctor'), getMyDoctorProfile);
router.put('/profile/update', protect, authorize('doctor'), updateDoctorProfile);

// Admin-only routes (Only Admin creates or deletes doctors)
router.post('/admin/create', protect, authorize('admin'), adminCreateDoctor);
router.delete('/admin/:id', protect, authorize('admin'), adminDeleteDoctor);

module.exports = router;