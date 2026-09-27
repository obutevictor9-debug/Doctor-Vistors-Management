const express = require('express');
const router = express.Router();
const {
  getDoctorAvailableSlots,
  createAppointment,
  getMyVisitorAppointments,
  getMyDoctorAppointments,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public: Check doctor's free slots for a date
router.get('/slots/:doctorId', getDoctorAvailableSlots);

// Visitor routes
router.post('/', protect, authorize('visitor'), createAppointment);
router.get('/my-appointments', protect, authorize('visitor'), getMyVisitorAppointments);

// Doctor routes
router.get('/doctor-appointments', protect, authorize('doctor'), getMyDoctorAppointments);

// Admin routes
router.get('/', protect, authorize('admin'), getAllAppointments);

// Shared authenticated routes
router.get('/:id', protect, getAppointmentById);
router.put('/:id/status', protect, authorize('doctor', 'admin'), updateAppointmentStatus);
router.put('/:id/reschedule', protect, authorize('visitor', 'doctor'), rescheduleAppointment);
router.put('/:id/cancel', protect, cancelAppointment);

module.exports = router;