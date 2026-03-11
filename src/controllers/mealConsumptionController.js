import { MealConsumption } from '../models/MealConsumption.js';
import { Meal } from '../models/Meal.js';
import { User } from '../models/User.js';
import { Wallet } from '../models/Wallet.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import Joi from 'joi';

// Validation schemas
const recordConsumptionSchema = Joi.object({
  meal_id: Joi.string().required(),
  user_id: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(10).default(1)
});

// Record meal consumption with wallet transaction
export const recordMealConsumption = async (req, res) => {
  const session = await MealConsumption.startSession();
  
  try {
    // Validate input
    const { error, value } = recordConsumptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { meal_id, user_id, quantity } = value;

    // Start transaction
    session.startTransaction();

    // Get meal information
    const meal = await Meal.findOne({ id: meal_id }).session(session);
    if (!meal) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    // Get user information
    const user = await User.findOne({ id: user_id }).session(session);
    if (!user || !user.is_active) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Get user wallet
    const wallet = await Wallet.getOrCreateWallet(user_id);
    const totalPrice = meal.price * quantity;

    // Check if user has sufficient balance
    if (!wallet.hasSufficientBalance(totalPrice)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          required: totalPrice,
          available: wallet.balance
        }
      });
    }

    // Check if consumption already exists for this user and meal
    const existingConsumption = await MealConsumption.findOne({
      user_id,
      meal_id
    }).session(session);

    if (existingConsumption) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'Meal consumption already recorded for this user'
      });
    }

    // Create meal consumption
    const consumption = new MealConsumption({
      user_id,
      meal_id,
      quantity,
      total_price: totalPrice,
      recorded_by: req.user.id
    });

    await consumption.save({ session });

    // Deduct from wallet
    const updatedWallet = await Wallet.updateBalance(
      user_id, 
      totalPrice, 
      'debit'
    );

    // Create wallet transaction
    await WalletTransaction.createTransaction(
      wallet.id,
      totalPrice,
      'debit',
      'meal',
      consumption.id,
      `Meal: ${meal.meal_type} on ${meal.date.toISOString().split('T')[0]}`
    );

    // Commit transaction
    await session.commitTransaction();

    // Get populated consumption data
    const populatedConsumption = await MealConsumption.findOne({ id: consumption.id })
      .populate('user_id', 'name email room_number')
      .populate('meal_id', 'date meal_type price')
      .populate('recorded_by', 'name email');

    res.status(201).json({
      success: true,
      message: 'Meal consumption recorded successfully',
      data: {
        consumption: populatedConsumption,
        wallet_balance: updatedWallet.balance
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Record meal consumption error:', error);
    
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === 'DUPLICATE_CONSUMPTION') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    session.endSession();
  }
};

// Get user's meal consumption history
export const getUserMealHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, start_date, end_date } = req.query;
    
    // Users can only see their own history unless they're managers
    if (req.user.role === 'user' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own meal history'
      });
    }

    // Build date range query
    let dateQuery = {};
    if (start_date || end_date) {
      dateQuery.created_at = {};
      if (start_date) dateQuery.created_at.$gte = new Date(start_date);
      if (end_date) dateQuery.created_at.$lte = new Date(end_date);
    }

    const consumptions = await MealConsumption.find({
      user_id: id,
      ...dateQuery
    })
      .populate('meal_id', 'date meal_type price')
      .populate('recorded_by', 'name')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MealConsumption.countDocuments({
      user_id: id,
      ...dateQuery
    });

    // Get user's current wallet balance
    const wallet = await Wallet.getOrCreateWallet(id);

    res.json({
      success: true,
      data: {
        consumptions,
        wallet_balance: wallet.balance,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_consumptions: total,
          per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user meal history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get consumption by meal
export const getConsumptionByMeal = async (req, res) => {
  try {
    const { meal_id } = req.params;
    
    // Verify meal exists
    const meal = await Meal.findOne({ id: meal_id });
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    const consumptions = await MealConsumption.getConsumptionByMeal(meal_id);

    res.json({
      success: true,
      data: {
        meal,
        consumptions
      }
    });
  } catch (error) {
    console.error('Get consumption by meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get daily consumption summary
export const getDailyConsumptionSummary = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required (format: YYYY-MM-DD)'
      });
    }

    const summary = await MealConsumption.getDailyConsumptionSummary(new Date(date));

    res.json({
      success: true,
      data: {
        date,
        summary
      }
    });
  } catch (error) {
    console.error('Get daily consumption summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete meal consumption (admin only - for corrections)
export const deleteMealConsumption = async (req, res) => {
  const session = await MealConsumption.startSession();
  
  try {
    const { id } = req.params;
    
    // Start transaction
    session.startTransaction();

    const consumption = await MealConsumption.findOne({ id }).session(session);
    if (!consumption) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Meal consumption not found'
      });
    }

    // Refund the amount to wallet
    await Wallet.updateBalance(
      consumption.user_id,
      consumption.total_price,
      'credit'
    );

    // Get wallet for transaction record
    const wallet = await Wallet.findOne({ user_id: consumption.user_id }).session(session);

    // Create refund transaction
    await WalletTransaction.createTransaction(
      wallet.id,
      consumption.total_price,
      'credit',
      'refund',
      consumption.id,
      `Refund for meal consumption (Admin correction)`
    );

    // Delete the consumption
    await MealConsumption.deleteOne({ id }).session(session);

    // Commit transaction
    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Meal consumption deleted and amount refunded'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Delete meal consumption error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    session.endSession();
  }
};
