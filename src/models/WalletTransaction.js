import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const walletTransactionSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  wallet_id: {
    type: String,
    required: [true, 'Wallet ID is required'],
    ref: 'Wallet'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: [true, 'Transaction type is required']
  },
  source: {
    type: String,
    enum: ['meal', 'rent', 'payment', 'deposit', 'refund'],
    required: [true, 'Transaction source is required']
  },
  reference_id: {
    type: String,
    required: [true, 'Reference ID is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
walletTransactionSchema.index({ id: 1 });
walletTransactionSchema.index({ wallet_id: 1, created_at: -1 });
walletTransactionSchema.index({ type: 1 });
walletTransactionSchema.index({ source: 1 });
walletTransactionSchema.index({ reference_id: 1 });
walletTransactionSchema.index({ created_at: -1 });

// Static method to get wallet transaction history
walletTransactionSchema.statics.getWalletHistory = function(walletId, limit = 50, offset = 0) {
  return this.find({ wallet_id: walletId })
    .sort({ created_at: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get transactions by source
walletTransactionSchema.statics.getTransactionsBySource = function(source, startDate, endDate) {
  const query = { source };
  
  if (startDate && endDate) {
    query.created_at = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  return this.find(query).sort({ created_at: -1 });
};

// Static method to get transaction summary
walletTransactionSchema.statics.getTransactionSummary = function(walletId, startDate, endDate) {
  const matchStage = { wallet_id: walletId };
  
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
        _id: '$type',
        total_amount: { $sum: '$amount' },
        transaction_count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total_credits: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'credit'] }, '$total_amount', 0]
          }
        },
        total_debits: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'debit'] }, '$total_amount', 0]
          }
        },
        credit_transactions: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'credit'] }, '$transaction_count', 0]
          }
        },
        debit_transactions: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'debit'] }, '$transaction_count', 0]
          }
        }
      }
    }
  ]);
};

// Instance method to get formatted transaction info
walletTransactionSchema.methods.getFormattedInfo = function() {
  return {
    id: this.id,
    wallet_id: this.wallet_id,
    amount: this.amount,
    type: this.type,
    source: this.source,
    reference_id: this.reference_id,
    description: this.description,
    created_at: this.created_at
  };
};

// Static method to create transaction (used by wallet operations)
walletTransactionSchema.statics.createTransaction = async function(walletId, amount, type, source, referenceId, description = '') {
  return this.create({
    wallet_id: walletId,
    amount,
    type,
    source,
    reference_id: referenceId,
    description
  });
};

export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
