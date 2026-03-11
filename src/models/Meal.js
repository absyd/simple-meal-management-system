import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const mealSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(value) {
        return !isNaN(value.getTime());
      },
      message: 'Invalid date format'
    }
  },
  meal_type: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: [true, 'Meal type is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [10000, 'Price cannot exceed 10000']
  },
  created_by: {
    type: String,
    required: [true, 'Created by user ID is required'],
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for unique meal per day per type
mealSchema.index({ date: 1, meal_type: 1 }, { unique: true });
mealSchema.index({ id: 1 });
mealSchema.index({ date: 1 });
mealSchema.index({ meal_type: 1 });

// Validation to prevent duplicate meals for the same date and type
mealSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const existingMeal = await this.constructor.findOne({
      date: this.date,
      meal_type: this.meal_type,
      _id: { $ne: this._id }
    });
    
    if (existingMeal) {
      const error = new Error(`Meal of type '${this.meal_type}' already exists for this date`);
      error.code = 'DUPLICATE_MEAL';
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get meals by date range
mealSchema.statics.getMealsByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1, meal_type: 1 });
};

// Static method to get today's meals
mealSchema.statics.getTodayMeals = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    date: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ meal_type: 1 });
};

// Instance method to get formatted meal info
mealSchema.methods.getFormattedInfo = function() {
  return {
    id: this.id,
    date: this.date.toISOString().split('T')[0],
    meal_type: this.meal_type,
    price: this.price,
    created_at: this.created_at
  };
};

export const Meal = mongoose.model('Meal', mealSchema);
