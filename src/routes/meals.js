import express from 'express';
import {
  getMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  getTodayMealsSummary
} from '../controllers/mealController.js';
import { authenticate, requireMealManager } from '../middleware/auth.js';

const router = express.Router();

// Get today's meals summary (public for authenticated users)
router.get('/today/summary', authenticate, getTodayMealsSummary);

// Get all meals (meal manager and above)
router.get('/', authenticate, requireMealManager, getMeals);

// Create new meal (meal manager and above)
router.post('/', authenticate, requireMealManager, createMeal);

// Get meal by ID (meal manager and above)
router.get('/:id', authenticate, requireMealManager, getMealById);

// Update meal (meal manager and above)
router.patch('/:id', authenticate, requireMealManager, updateMeal);

// Delete meal (meal manager and above)
router.delete('/:id', authenticate, requireMealManager, deleteMeal);

export default router;
