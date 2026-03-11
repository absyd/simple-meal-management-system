import express from 'express';
import {
  createRentRecord,
  getRentRecordsByMonth,
  getUserRentRecords,
  updateRentRecord,
  markRentAsPaid,
  getOverdueRentRecords,
  getRentPaymentHistory,
  getRentSummary
} from '../controllers/rentController.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = express.Router();

// Get rent summary for dashboard (manager and above)
router.get('/summary', authenticate, requireManager, getRentSummary);

// Get rent records by month (manager and above)
router.get('/monthly', authenticate, requireManager, getRentRecordsByMonth);

// Get overdue rent records (manager and above)
router.get('/overdue', authenticate, requireManager, getOverdueRentRecords);

// Get rent payment history (manager and above)
router.get('/payment-history', authenticate, requireManager, getRentPaymentHistory);

// Create rent record (manager and above)
router.post('/', authenticate, requireManager, createRentRecord);

// Get user's rent records (authenticated users)
router.get('/user/:id', authenticate, getUserRentRecords);

// Update rent record (manager and above)
router.patch('/:id', authenticate, requireManager, updateRentRecord);

// Mark rent as paid (manager and above)
router.patch('/:id/mark-paid', authenticate, requireManager, markRentAsPaid);

export default router;
