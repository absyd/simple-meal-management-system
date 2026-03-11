import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const walletSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  user_id: {
    type: String,
    required: [true, 'User ID is required'],
    unique: true,
    ref: 'User'
  },
  balance: {
    type: Number,
    required: [true, 'Balance is required'],
    default: 0,
    min: [0, 'Balance cannot be negative']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
walletSchema.index({ id: 1 });
walletSchema.index({ user_id: 1 }, { unique: true });

// Pre-save middleware to validate balance
walletSchema.pre('save', function(next) {
  if (this.balance < 0) {
    const error = new Error('Wallet balance cannot be negative');
    error.code = 'NEGATIVE_BALANCE';
    return next(error);
  }
  next();
});

// Static method to get or create wallet for user
walletSchema.statics.getOrCreateWallet = async function(userId) {
  let wallet = await this.findOne({ user_id: userId });
  
  if (!wallet) {
    wallet = await this.create({ user_id: userId, balance: 0 });
  }
  
  return wallet;
};

// Static method to update wallet balance
walletSchema.statics.updateBalance = async function(userId, amount, type = 'credit') {
  const wallet = await this.getOrCreateWallet(userId);
  
  if (type === 'credit') {
    wallet.balance += amount;
  } else if (type === 'debit') {
    if (wallet.balance < amount) {
      const error = new Error('Insufficient balance');
      error.code = 'INSUFFICIENT_BALANCE';
      throw error;
    }
    wallet.balance -= amount;
  } else {
    const error = new Error('Invalid transaction type');
    error.code = 'INVALID_TRANSACTION_TYPE';
    throw error;
  }
  
  await wallet.save();
  return wallet;
};

// Instance method to check if user has sufficient balance
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

// Instance method to get formatted wallet info
walletSchema.methods.getFormattedInfo = function() {
  return {
    id: this.id,
    user_id: this.user_id,
    balance: this.balance,
    updated_at: this.updated_at
  };
};

export const Wallet = mongoose.model('Wallet', walletSchema);
