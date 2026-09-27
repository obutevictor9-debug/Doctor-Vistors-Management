const express = require('express');
const router = express.Router();
const {
  checkInVisitor,
  startConsultation,
  completeVisit,
  getActiveVisits,
  getVisitById,
  getVisitHistory,
  cancelVisit,
} = require('../controllers/visitController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Physical check-in (Visitor self-checkin, Admin or Doctor)
router.post('/check-in', protect, checkInVisitor);

// Live waiting room queue (Doctor & Admin)
router.get('/active', protect, authorize('doctor', 'admin'), getActiveVisits);

// Visit history (Self-scoped for visitor/doctor, global for admin)
router.get('/history', protect, getVisitHistory);

// Single visit lookup
router.get('/:id', protect, getVisitById);

// Doctor consultation lifecycle
router.put('/:id/start', protect, authorize('doctor'), startConsultation);
router.put('/:id/complete', protect, authorize('doctor'), completeVisit);
router.put('/:id/cancel', protect, authorize('doctor', 'admin'), cancelVisit);

module.exports = router;