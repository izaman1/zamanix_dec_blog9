import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addEvent,
  getEvents,
  deleteEvent
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Calendar routes
router.route('/events')
  .get(protect, getEvents)
  .post(protect, addEvent);
router.delete('/events/:eventId', protect, deleteEvent);

export default router;