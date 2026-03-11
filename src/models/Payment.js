import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  user_id: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  payment_type: {
    type: String,
    enum: ['meal', 'rent', 'deposit'],
    required: [true, 'Payment type is required']
  },
  method: {
    type: String,
    enum: ['online', 'cash'],
    required: [true, 'Payment method is required']
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
    required: true
  },
  gateway: {
    type: String,
    trim: true,
    maxlength: [50, 'Gateway name cannot exceed 50 characters']
  },
  transaction_id: {
    type: String,
    trim: true,
    maxlength: [100, 'Transaction ID cannot exceed 100 characters']
  },
  gateway_response: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  failure_reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
paymentSchema.index({ id: 1 });
paymentSchema.index({ user_id: 1, created_at: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payment_type: 1 });
paymentSchema.index({ transaction_id: 1 });
paymentSchema.index({ created_at: -1 });

// Static method to get user payment history
paymentSchema.statics.getUserPaymentHistory = function(userId, limit = 50, offset = 0) {
  return this.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get payments by status
paymentSchema.statics.getPaymentsByStatus = function(status) {
  return this.find({ status }).sort({ created_at: -1 });
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStatistics = function(startDate, endDate) {
  const matchStage = {};
  
  if (startDate && endDate) {
    matchStage.created_at = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          status: '$status',
          payment_type: '$payment_type'
        },
        total_amount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.payment_type',
        statuses: {
          $push: {
            status: '$_id.status',
            total_amount: '$total_amount',
            count: '$count'
          }
        },
        total_amount: { $sum: '$total_amount' },
        total_count: { $sum: '$count' }
      }
    }
  ]);
};

// Static method to create online payment
paymentSchema.statics.createOnlinePayment = async function(userId, amount, paymentType, gateway) {
  return this.create({
    user_id: userId,
    amount,
    payment_type: paymentType,
    method: 'online',
    gateway,
    status: 'pending'
  });
};

// Instance method to mark as successful
paymentSchema.methods.markAsSuccessful = function(transactionId, gatewayResponse = {}) {
  this.status = 'success';
  this.transaction_id = transactionId;
  this.gateway_response = gatewayResponse;
  this.failure_reason = undefined;
  return this.save();
};

// Instance method to mark as failed
paymentSchema.methods.markAsFailed = function(failureReason, gatewayResponse = {}) {
  this.status = 'failed';
  this.failure_reason = failureReason;
  this.gateway_response = gatewayResponse;
  return this.save();
};

// Instance method to get formatted payment info
paymentSchema.methods.getFormattedInfo = function() {
  return {
    id: this.id,
    user_id: this.user_id,
    amount: this.amount,
    payment_type: this.payment_type,
    method: this.method,
    status: this.status,
    gateway: this.gateway,
    transaction_id: this.transaction_id,
    failure_reason: this.failure_reason,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
};

export const Payment = mongoose.model('Payment', paymentSchema);
