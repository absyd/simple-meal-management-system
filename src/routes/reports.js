import express from 'express';
import {
  getMonthlyMealReports,
  getFinancialReports,
  getUserReports,
  getDashboardAnalytics
} from '../controllers/reportsController.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard analytics (manager and above)
router.get('/dashboard', authenticate, requireManager, getDashboardAnalytics);

// Get monthly meal reports (manager and above)
router.get('/monthly-meals', authenticate, requireManager, getMonthlyMealReports);

// Get financial reports (admin/manager only)
router.get('/finance', authenticate, requireManager, getFinancialReports);

// Get user-specific reports (authenticated users)
router.get('/user/:id', authenticate, getUserReports);

export default router;
