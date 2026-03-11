import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const rentRecordSchema = new mongoose.Schema({
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
  month: {
    type: String,
    required: [true, 'Month is required'],
    validate: {
      validator: function(value) {
        // Format: YYYY-MM (e.g., 2024-01)
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
      },
      message: 'Month must be in format YYYY-MM'
    }
  },
  rent_amount: {
    type: Number,
    required: [true, 'Rent amount is required'],
    min: [0, 'Rent amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
    required: true
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  paid_date: {
    type: Date
  },
  payment_reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Payment reference cannot exceed 100 characters']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for unique rent record per user per month
rentRecordSchema.index({ user_id: 1, month: 1 }, { unique: true });
rentRecordSchema.index({ id: 1 });
rentRecordSchema.index({ status: 1 });
rentRecordSchema.index({ month: 1 });
rentRecordSchema.index({ created_at: -1 });

// Pre-save middleware to validate
rentRecordSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    // Check if rent record already exists for this user and month
    const existingRecord = await this.constructor.findOne({
      user_id: this.user_id,
      month: this.month,
      _id: { $ne: this._id }
    });
    
    if (existingRecord) {
      const error = new Error(`Rent record already exists for month ${this.month}`);
      error.code = 'DUPLICATE_RENT_RECORD';
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get or create rent record for user and month
rentRecordSchema.statics.getOrCreateRentRecord = async function(userId, month, rentAmount) {
  let rentRecord = await this.findOne({ user_id: userId, month });
  
  if (!rentRecord) {
    rentRecord = await this.create({
      user_id: userId,
      month,
      rent_amount: rentAmount,
      status: 'pending'
    });
  }
  
  return rentRecord;
};

// Static method to get user's rent records
rentRecordSchema.statics.getUserRentRecords = function(userId, limit = 12, offset = 0) {
  return this.find({ user_id: userId })
    .sort({ month: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get rent records by month
rentRecordSchema.statics.getRentRecordsByMonth = function(month) {
  return this.find({ month })
    .populate('user_id', 'name email room_number')
    .sort({ created_at: 1 });
};

// Static method to get rent statistics
rentRecordSchema.statics.getRentStatistics = function(month) {
  return this.aggregate([
    { $match: { month } },
    {
      $group: {
        _id: '$status',
        total_amount: { $sum: '$rent_amount' },
        paid_amount: { $sum: '$paid_amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get overdue rent records
rentRecordSchema.statics.getOverdueRentRecords = function(currentMonth) {
  return this.find({
    month: { $lt: currentMonth },
    status: 'pending'
  }).populate('user_id', 'name email room_number');
};

// Instance method to mark as paid
rentRecordSchema.methods.markAsPaid = function(paidAmount, paymentReference) {
  this.status = 'paid';
  this.paid_amount = paidAmount;
  this.paid_date = new Date();
  this.payment_reference = paymentReference;
  return this.save();
};

// Instance method to get formatted rent info
rentRecordSchema.methods.getFormattedInfo = function() {
  return {
    id: this.id,
    user_id: this.user_id,
    month: this.month,
    rent_amount: this.rent_amount,
    status: this.status,
    paid_amount: this.paid_amount,
    paid_date: this.paid_date,
    payment_reference: this.payment_reference,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
};

// Instance method to get remaining amount
rentRecordSchema.methods.getRemainingAmount = function() {
  return this.rent_amount - this.paid_amount;
};

export const RentRecord = mongoose.model('RentRecord', rentRecordSchema);
