import express from 'express';
import {
  recordMealConsumption,
  getUserMealHistory,
  getConsumptionByMeal,
  getDailyConsumptionSummary,
  deleteMealConsumption
} from '../controllers/mealConsumptionController.js';
import { authenticate, requireMealManager, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Record meal consumption (meal manager and above)
router.post('/', authenticate, requireMealManager, recordMealConsumption);

// Get daily consumption summary (meal manager and above)
router.get('/daily-summary', authenticate, requireMealManager, getDailyConsumptionSummary);

// Get consumption by meal (meal manager and above)
router.get('/meal/:meal_id', authenticate, requireMealManager, getConsumptionByMeal);

// Get user's meal consumption history (authenticated users)
router.get('/user/:id', authenticate, getUserMealHistory);

// Delete meal consumption (admin only - for corrections)
router.delete('/:id', authenticate, requireAdmin, deleteMealConsumption);

export default router;
