const express = require('express');
const router = express.Router();
const {
  updateProfile,
  uploadProfileImage,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Self profile actions (Any logged-in user)
router.put('/profile', protect, updateProfile);
router.post('/profile/upload-image', protect, upload.single('image'), uploadProfileImage);

// Admin-restricted routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;