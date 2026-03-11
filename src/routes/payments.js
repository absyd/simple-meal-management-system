import express from 'express';
import {
  createPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentWebhook,
  getPaymentHistory,
  getAllPayments
} from '../controllers/paymentController.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = express.Router();

// Create online payment
router.post('/create', authenticate, createPayment);

// Get user's payment history
router.get('/history', authenticate, getPaymentHistory);

// SSLCommerz callbacks
router.get('/success/:id', paymentSuccess);
router.get('/fail/:id', paymentFail);
router.get('/cancel/:id', paymentCancel);

// SSLCommerz webhook (IPN)
router.post('/webhook', paymentWebhook);

// Get all payments (admin/manager only)
router.get('/all', authenticate, requireManager, getAllPayments);

export default router;
