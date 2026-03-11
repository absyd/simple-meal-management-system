import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const mealConsumptionSchema = new mongoose.Schema({
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
  meal_id: {
    type: String,
    required: [true, 'Meal ID is required'],
    ref: 'Meal'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Quantity cannot exceed 10'],
    default: 1
  },
  total_price: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  recorded_by: {
    type: String,
    required: [true, 'Recorded by user ID is required'],
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
mealConsumptionSchema.index({ id: 1 });
mealConsumptionSchema.index({ user_id: 1, created_at: -1 });
mealConsumptionSchema.index({ meal_id: 1 });
mealConsumptionSchema.index({ created_at: -1 });
mealConsumptionSchema.index({ user_id: 1, meal_id: 1 }, { unique: true });

// Pre-save middleware to calculate total price and validate
mealConsumptionSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    // Get the meal to calculate total price
    const Meal = mongoose.model('Meal');
    const meal = await Meal.findOne({ id: this.meal_id });
    
    if (!meal) {
      const error = new Error('Meal not found');
      error.code = 'MEAL_NOT_FOUND';
      return next(error);
    }
    
    this.total_price = meal.price * this.quantity;
    
    // Check if user already has consumption for this meal
    const existingConsumption = await this.constructor.findOne({
      user_id: this.user_id,
      meal_id: this.meal_id,
      _id: { $ne: this._id }
    });
    
    if (existingConsumption) {
      const error = new Error('User already has consumption recorded for this meal');
      error.code = 'DUPLICATE_CONSUMPTION';
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get user's meal consumption by date range
mealConsumptionSchema.statics.getUserConsumptionByDateRange = function(userId, startDate, endDate) {
  return this.find({
    user_id: userId,
    created_at: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('meal_id').sort({ created_at: -1 });
};

// Static method to get consumption by meal
mealConsumptionSchema.statics.getConsumptionByMeal = function(mealId) {
  return this.find({ meal_id: mealId })
    .populate('user_id', 'name email room_number')
    .sort({ created_at: 1 });
};

// Static method to get daily consumption summary
mealConsumptionSchema.statics.getDailyConsumptionSummary = function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        created_at: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $lookup: {
        from: 'meals',
        localField: 'meal_id',
        foreignField: 'id',
        as: 'meal_info'
      }
    },
    {
      $unwind: '$meal_info'
    },
    {
      $group: {
        _id: '$meal_info.meal_type',
        total_consumptions: { $sum: 1 },
        total_quantity: { $sum: '$quantity' },
        total_revenue: { $sum: '$total_price' },
        unique_users: { $addToSet: '$user_id' }
      }
    },
    {
      $addFields: {
        unique_user_count: { $size: '$unique_users' }
      }
    },
    {
      $project: {
        unique_users: 0
      }
    }
  ]);
};

// Instance method to get formatted consumption info
mealConsumptionSchema.methods.getFormattedInfo = function() {
  return {
    id: this.id,
    user_id: this.user_id,
    meal_id: this.meal_id,
    quantity: this.quantity,
    total_price: this.total_price,
    recorded_by: this.recorded_by,
    created_at: this.created_at
  };
};

export const MealConsumption = mongoose.model('MealConsumption', mealConsumptionSchema);
