import { Meal } from '../models/Meal.js';
import { MealConsumption } from '../models/MealConsumption.js';
import Joi from 'joi';

// Validation schemas
const createMealSchema = Joi.object({
  date: Joi.date().required(),
  meal_type: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
  price: Joi.number().required().min(0).max(10000)
});

const updateMealSchema = Joi.object({
  price: Joi.number().min(0).max(10000)
});

const recordConsumptionSchema = Joi.object({
  meal_id: Joi.string().required(),
  user_id: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(10).default(1)
});

// Get all meals
export const getMeals = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      meal_type, 
      start_date, 
      end_date,
      today 
    } = req.query;
    
    // Build query
    let query = {};
    
    if (today === 'true') {
      // Get today's meals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.date = {
        $gte: today,
        $lt: tomorrow
      };
    } else {
      if (meal_type) query.meal_type = meal_type;
      
      if (start_date || end_date) {
        query.date = {};
        if (start_date) query.date.$gte = new Date(start_date);
        if (end_date) query.date.$lte = new Date(end_date);
      }
    }

    const meals = await Meal.find(query)
      .populate('created_by', 'name email')
      .sort({ date: -1, meal_type: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meal.countDocuments(query);

    res.json({
      success: true,
      data: {
        meals,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_meals: total,
          per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get meal by ID
export const getMealById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const meal = await Meal.findOne({ id })
      .populate('created_by', 'name email');
    
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    // Get consumption statistics for this meal
    const consumptionStats = await MealConsumption.aggregate([
      { $match: { meal_id: id } },
      {
        $group: {
          _id: null,
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

    res.json({
      success: true,
      data: {
        meal,
        statistics: consumptionStats[0] || {
          total_consumptions: 0,
          total_quantity: 0,
          total_revenue: 0,
          unique_user_count: 0
        }
      }
    });
  } catch (error) {
    console.error('Get meal by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new meal
export const createMeal = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createMealSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { date, meal_type, price } = value;

    // Create new meal
    const meal = new Meal({
      date,
      meal_type,
      price,
      created_by: req.user.id
    });

    await meal.save();

    const populatedMeal = await Meal.findOne({ id: meal.id })
      .populate('created_by', 'name email');

    res.status(201).json({
      success: true,
      message: 'Meal created successfully',
      data: {
        meal: populatedMeal
      }
    });
  } catch (error) {
    console.error('Create meal error:', error);
    
    if (error.code === 'DUPLICATE_MEAL') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update meal
export const updateMeal = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate input
    const { error, value } = updateMealSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const meal = await Meal.findOne({ id });
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    // Update meal fields
    if (value.price !== undefined) meal.price = value.price;

    await meal.save();

    const populatedMeal = await Meal.findOne({ id: meal.id })
      .populate('created_by', 'name email');

    res.json({
      success: true,
      message: 'Meal updated successfully',
      data: {
        meal: populatedMeal
      }
    });
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete meal
export const deleteMeal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const meal = await Meal.findOne({ id });
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    // Check if there are consumptions for this meal
    const consumptionCount = await MealConsumption.countDocuments({ meal_id: id });
    if (consumptionCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete meal with existing consumptions'
      });
    }

    await Meal.deleteOne({ id });

    res.json({
      success: true,
      message: 'Meal deleted successfully'
    });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get today's meals with consumption summary
export const getTodayMealsSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const meals = await Meal.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ meal_type: 1 });

    // Get consumption summary for today
    const summary = await MealConsumption.getDailyConsumptionSummary(today);

    res.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        meals,
        consumption_summary: summary
      }
    });
  } catch (error) {
    console.error('Get today meals summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
