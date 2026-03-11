import { MealConsumption } from '../models/MealConsumption.js';
import { Payment } from '../models/Payment.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { RentRecord } from '../models/RentRecord.js';
import { User } from '../models/User.js';
import { Wallet } from '../models/Wallet.js';
import Joi from 'joi';

// Validation schemas
const dateRangeSchema = Joi.object({
  start_date: Joi.date().required(),
  end_date: Joi.date().required().min(Joi.ref('start_date')),
  user_id: Joi.string().optional()
});

const monthSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required()
});

// Get monthly meal reports
export const getMonthlyMealReports = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month parameters are required (format: year=2024&month=01)'
      });
    }

    // Validate month format
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 01 and 12'
      });
    }

    // Create date range for the month
    const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get meal consumption statistics for the month
    const mealStats = await MealConsumption.aggregate([
      {
        $match: {
          created_at: { $gte: startDate, $lte: endDate }
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
          _id: {
            user_id: '$user_id',
            meal_type: '$meal_info.meal_type'
          },
          total_meals: { $sum: '$quantity' },
          total_cost: { $sum: '$total_price' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.user_id',
          foreignField: 'id',
          as: 'user_info'
        }
      },
      {
        $unwind: '$user_info'
      },
      {
        $group: {
          _id: '$_id.user_id',
          user_info: { $first: '$user_info' },
          meals: {
            $push: {
              meal_type: '$_id.meal_type',
              total_meals: '$total_meals',
              total_cost: '$total_cost'
            }
          },
          total_meals: { $sum: '$total_meals' },
          total_cost: { $sum: '$total_cost' }
        }
      },
      {
        $project: {
          user_info: {
            name: 1,
            email: 1,
            room_number: 1
          },
          meals: 1,
          total_meals: 1,
          total_cost: 1
        }
      },
      {
        $sort: { 'user_info.name': 1 }
      }
    ]);

    // Get overall meal type statistics
    const overallStats = await MealConsumption.aggregate([
      {
        $match: {
          created_at: { $gte: startDate, $lte: endDate }
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

    res.json({
      success: true,
      data: {
        period: {
          year: parseInt(year),
          month: parseInt(month),
          start_date: startDate,
          end_date: endDate
        },
        user_reports: mealStats,
        overall_statistics: overallStats,
        summary: {
          total_users: mealStats.length,
          total_consumptions: mealStats.reduce((sum, user) => sum + user.total_meals, 0),
          total_revenue: mealStats.reduce((sum, user) => sum + user.total_cost, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get monthly meal reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get financial reports
export const getFinancialReports = async (req, res) => {
  try {
    const { start_date, end_date, report_type } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Get payment statistics
    const paymentStats = await Payment.getPaymentStatistics(startDate, endDate);

    // Get wallet transaction summary
    const walletStats = await WalletTransaction.aggregate([
      {
        $match: {
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total_amount: { $sum: '$amount' },
          transaction_count: { $sum: 1 }
        }
      }
    ]);

    // Get rent statistics for the period
    const rentStats = await RentRecord.aggregate([
      {
        $match: {
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          total_amount: { $sum: '$rent_amount' },
          paid_amount: { $sum: '$paid_amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get meal revenue for the period
    const mealRevenue = await MealConsumption.aggregate([
      {
        $match: {
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$total_price' },
          total_consumptions: { $sum: 1 }
        }
      }
    ]);

    // Calculate total wallet balance
    const totalWalletBalance = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          total_balance: { $sum: '$balance' },
          total_wallets: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate
        },
        payment_statistics: paymentStats,
        wallet_statistics: walletStats,
        rent_statistics: rentStats,
        meal_revenue: mealRevenue[0] || { total_revenue: 0, total_consumptions: 0 },
        wallet_summary: totalWalletBalance[0] || { total_balance: 0, total_wallets: 0 }
      }
    });

  } catch (error) {
    console.error('Get financial reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user-specific reports
export const getUserReports = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    // Users can only see their own reports unless they're managers
    if (req.user.role === 'user' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own reports'
      });
    }

    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();

    // Get user information
    const user = await User.findOne({ id }).select('-password_hash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's wallet information
    const wallet = await Wallet.getOrCreateWallet(id);

    // Get meal consumption history
    const mealHistory = await MealConsumption.getUserConsumptionByDateRange(id, startDate, endDate);

    // Get payment history
    const paymentHistory = await Payment.getUserPaymentHistory(id, 50, 0);

    // Get wallet transactions
    const walletTransactions = await WalletTransaction.getWalletHistory(wallet.id, 50, 0);

    // Get rent records
    const rentRecords = await RentRecord.getUserRentRecords(id, 12, 0);

    // Calculate summary statistics
    const totalMealCost = mealHistory.reduce((sum, consumption) => sum + consumption.total_price, 0);
    const totalPayments = paymentHistory.payments
      .filter(p => p.status === 'success')
      .reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      success: true,
      data: {
        user,
        wallet: wallet.getFormattedInfo(),
        period: {
          start_date: startDate,
          end_date: endDate
        },
        meal_history: mealHistory,
        payment_history: paymentHistory.payments,
        wallet_transactions: walletTransactions,
        rent_records: rentRecords,
        summary: {
          total_meal_cost: totalMealCost,
          total_payments: totalPayments,
          current_balance: wallet.balance,
          total_meals: mealHistory.length,
          pending_rent: rentRecords.filter(r => r.status === 'pending').length
        }
      }
    });

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get dashboard analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get user statistics
    const totalUsers = await User.countDocuments({ is_active: true });
    const newUsersThisMonth = await User.countDocuments({
      created_at: { $gte: thisMonth }
    });

    // Get today's meal summary
    const todayMealSummary = await MealConsumption.getDailyConsumptionSummary(today);

    // Get this month's meal statistics
    const thisMonthMealStats = await MealConsumption.aggregate([
      {
        $match: {
          created_at: { $gte: thisMonth }
        }
      },
      {
        $group: {
          _id: null,
          total_consumptions: { $sum: 1 },
          total_revenue: { $sum: '$total_price' }
        }
      }
    ]);

    // Get last month's meal statistics for comparison
    const lastMonthMealStats = await MealConsumption.aggregate([
      {
        $match: {
          created_at: { $gte: lastMonth, $lte: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total_consumptions: { $sum: 1 },
          total_revenue: { $sum: '$total_price' }
        }
      }
    ]);

    // Get payment statistics
    const thisMonthPayments = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          created_at: { $gte: thisMonth }
        }
      },
      {
        $group: {
          _id: null,
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get rent statistics
    const currentMonth = today.toISOString().slice(0, 7);
    const rentStats = await RentRecord.getRentStatistics(currentMonth);

    // Get wallet summary
    const walletSummary = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          total_balance: { $sum: '$balance' },
          average_balance: { $avg: '$balance' },
          total_wallets: { $sum: 1 }
        }
      }
    ]);

    // Calculate growth percentages
    const mealConsumptionGrowth = lastMonthMealStats[0] ? 
      ((thisMonthMealStats[0]?.total_consumptions - lastMonthMealStats[0].total_consumptions) / lastMonthMealStats[0].total_consumptions * 100) : 0;
    
    const mealRevenueGrowth = lastMonthMealStats[0] ? 
      ((thisMonthMealStats[0]?.total_revenue - lastMonthMealStats[0].total_revenue) / lastMonthMealStats[0].total_revenue * 100) : 0;

    res.json({
      success: true,
      data: {
        user_statistics: {
          total_users,
          new_users_this_month: newUsersThisMonth
        },
        meal_statistics: {
          today_summary: todayMealSummary,
          this_month: thisMonthMealStats[0] || { total_consumptions: 0, total_revenue: 0 },
          growth: {
            consumption_growth: Math.round(mealConsumptionGrowth * 100) / 100,
            revenue_growth: Math.round(mealRevenueGrowth * 100) / 100
          }
        },
        payment_statistics: {
          this_month: thisMonthPayments[0] || { total_amount: 0, count: 0 }
        },
        rent_statistics: rentStats,
        wallet_summary: walletSummary[0] || { total_balance: 0, average_balance: 0, total_wallets: 0 }
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
