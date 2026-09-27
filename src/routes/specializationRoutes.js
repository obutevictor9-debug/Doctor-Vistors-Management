const express = require('express');
const router = express.Router();
const {
  createSpecialization,
  getSpecializations,
  getSpecializationById,
  updateSpecialization,
  deleteSpecialization,
} = require('../controllers/specializationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public endpoints (visitors browsing categories)
router.get('/', getSpecializations);
router.get('/:id', getSpecializationById);

// Admin-only management
router.post('/', protect, authorize('admin'), createSpecialization);
router.put('/:id', protect, authorize('admin'), updateSpecialization);
router.delete('/:id', protect, authorize('admin'), deleteSpecialization);

module.exports = router;