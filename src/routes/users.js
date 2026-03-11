import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStatistics
} from '../controllers/userController.js';
import { authenticate, authorize, requireAdmin, requireManager } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user statistics (admin/manager only)
router.get('/statistics', requireManager, getUserStatistics);

// Get all users (admin/manager only)
router.get('/', requireManager, getUsers);

// Create new user (admin only)
router.post('/', requireAdmin, createUser);

// Get user by ID (admin/manager only, or own profile)
router.get('/:id', requireManager, getUserById);

// Update user (admin only)
router.patch('/:id', requireAdmin, updateUser);

// Delete user (admin only)
router.delete('/:id', requireAdmin, deleteUser);

export default router;
