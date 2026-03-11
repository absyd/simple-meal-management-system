import { Payment } from '../models/Payment.js';
import { Wallet } from '../models/Wallet.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { RentRecord } from '../models/RentRecord.js';
import { getEnvConfig } from '../config/database.js';
import crypto from 'crypto';
import Joi from 'joi';

const envConfig = getEnvConfig();

// Validation schemas
const createPaymentSchema = Joi.object({
  amount: Joi.number().required().min(1),
  payment_type: Joi.string().valid('meal', 'rent', 'deposit').required()
});

// Create online payment
export const createPayment = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { amount, payment_type } = value;

    // Create payment record
    const payment = await Payment.createOnlinePayment(
      req.user.id,
      amount,
      payment_type,
      'SSLCommerz'
    );

    // Prepare SSLCommerz payment data
    const paymentData = {
      store_id: envConfig.PAYMENT_GATEWAY.SSLCOMMERZ.STORE_ID,
      store_passwd: envConfig.PAYMENT_GATEWAY.SSLCOMMERZ.STORE_PASSWORD,
      total_amount: amount,
      currency: 'BDT',
      tran_id: payment.id,
      success_url: `${req.protocol}://${req.get('host')}/api/payments/success/${payment.id}`,
      fail_url: `${req.protocol}://${req.get('host')}/api/payments/fail/${payment.id}`,
      cancel_url: `${req.protocol}://${req.get('host')}/api/payments/cancel/${payment.id}`,
      ipn_url: `${req.protocol}://${req.get('host')}/api/payments/webhook`,
      product_name: `${payment_type} Payment`,
      product_category: payment_type,
      product_profile: 'general',
      cus_name: req.user.name,
      cus_email: req.user.email,
      cus_phone: req.user.phone,
      cus_add1: 'Hostel',
      shipping_method: 'NO',
      multi_card_name: 'mastercard,visacard,amexcard'
    };

    // For development, return mock payment URL
    if (envConfig.NODE_ENV === 'development') {
      const paymentUrl = `${envConfig.PAYMENT_GATEWAY.SSLCOMMERZ.BASE_URL}/gwprocess/v4/api.php?${new URLSearchParams(paymentData)}`;
      
      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          payment: payment.getFormattedInfo(),
          payment_url: paymentUrl,
          payment_data: paymentData
        }
      });
    } else {
      // In production, you would make actual API call to SSLCommerz
      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          payment: payment.getFormattedInfo(),
          payment_data: paymentData
        }
      });
    }

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// SSLCommerz success callback
export const paymentSuccess = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findOne({ id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // In a real implementation, you would verify the transaction with SSLCommerz
    // For now, we'll mark it as successful
    await payment.markAsSuccessful(req.query.tran_id, req.query);

    // Process the successful payment
    await processSuccessfulPayment(payment);

    // Redirect to frontend success page
    res.redirect(`${req.protocol}://${req.get('host')}/payment/success?payment_id=${id}`);

  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// SSLCommerz fail callback
export const paymentFail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findOne({ id });
    if (payment) {
      await payment.markAsFailed('Payment failed', req.query);
    }

    // Redirect to frontend fail page
    res.redirect(`${req.protocol}://${req.get('host')}/payment/fail?payment_id=${id}`);

  } catch (error) {
    console.error('Payment fail error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// SSLCommerz cancel callback
export const paymentCancel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findOne({ id });
    if (payment) {
      await payment.markAsFailed('Payment cancelled', req.query);
    }

    // Redirect to frontend cancel page
    res.redirect(`${req.protocol}://${req.get('host')}/payment/cancel?payment_id=${id}`);

  } catch (error) {
    console.error('Payment cancel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// SSLCommerz webhook (IPN)
export const paymentWebhook = async (req, res) => {
  try {
    // Verify webhook signature (important for security)
    const isValid = verifyWebhookSignature(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const { tran_id, status, amount, currency, card_type, store_amount, bank_tran_id } = req.body;

    // Find payment by transaction ID
    const payment = await Payment.findOne({ id: tran_id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (status === 'VALID' || status === 'VALIDATED') {
      // Payment successful
      if (payment.status === 'pending') {
        await payment.markAsSuccessful(bank_tran_id, req.body);
        await processSuccessfulPayment(payment);
      }
    } else {
      // Payment failed
      if (payment.status === 'pending') {
        await payment.markAsFailed(`Payment failed: ${status}`, req.body);
      }
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Process successful payment (update wallet, rent records, etc.)
async function processSuccessfulPayment(payment) {
  const session = await Payment.startSession();
  
  try {
    session.startTransaction();

    // Get or create user wallet
    const wallet = await Wallet.getOrCreateWallet(payment.user_id);

    // Add amount to wallet
    await Wallet.updateBalance(payment.user_id, payment.amount, 'credit');

    // Create wallet transaction
    await WalletTransaction.createTransaction(
      wallet.id,
      payment.amount,
      'credit',
      'payment',
      payment.id,
      `Online payment via ${payment.gateway}`
    );

    // If it's a rent payment, update rent record
    if (payment.payment_type === 'rent') {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const rentRecord = await RentRecord.getOrCreateRentRecord(
        payment.user_id,
        currentMonth,
        payment.amount
      );

      if (rentRecord.status === 'pending') {
        await rentRecord.markAsPaid(payment.amount, payment.id);
      }
    }

    await session.commitTransaction();

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Verify SSLCommerz webhook signature
function verifyWebhookSignature(payload) {
  // In a real implementation, you would verify the signature
  // For development, we'll skip verification
  if (envConfig.NODE_ENV === 'development') {
    return true;
  }

  // TODO: Implement actual signature verification
  // const signature = req.headers['sslcommerz-signature'];
  // const calculatedSignature = crypto.createHmac('sha256', STORE_PASSWORD)
  //   .update(JSON.stringify(payload))
  //   .digest('hex');
  // return signature === calculatedSignature;
  
  return true;
}

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_type } = req.query;
    
    // Build query
    let query = { user_id: req.user.id };
    
    if (status) query.status = status;
    if (payment_type) query.payment_type = payment_type;

    const payments = await Payment.find(query)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_payments: total,
          per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all payments (admin/manager only)
export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_type, start_date, end_date } = req.query;
    
    // Build query
    let query = {};
    
    if (status) query.status = status;
    if (payment_type) query.payment_type = payment_type;
    
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const payments = await Payment.find(query)
      .populate('user_id', 'name email room_number')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_payments: total,
          per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
