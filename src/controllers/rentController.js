import { RentRecord } from '../models/RentRecord.js';
import { Payment } from '../models/Payment.js';
import Joi from 'joi';

// Validation schemas
const createRentRecordSchema = Joi.object({
  user_id: Joi.string().required(),
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required(),
  rent_amount: Joi.number().required().min(0)
});

const updateRentRecordSchema = Joi.object({
  rent_amount: Joi.number().min(0),
  status: Joi.string().valid('pending', 'paid')
});

// Create rent record
export const createRentRecord = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createRentRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { user_id, month, rent_amount } = value;

    // Create rent record
    const rentRecord = await RentRecord.getOrCreateRentRecord(user_id, month, rent_amount);

    res.status(201).json({
      success: true,
      message: 'Rent record created successfully',
      data: {
        rent_record: rentRecord.getFormattedInfo()
      }
    });

  } catch (error) {
    console.error('Create rent record error:', error);
    
    if (error.code === 'DUPLICATE_RENT_RECORD') {
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

// Get rent records by month
export const getRentRecordsByMonth = async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required (format: YYYY-MM)'
      });
    }

    const rentRecords = await RentRecord.getRentRecordsByMonth(month);

    // Get statistics for the month
    const statistics = await RentRecord.getRentStatistics(month);

    res.json({
      success: true,
      data: {
        month,
        rent_records: rentRecords,
        statistics
      }
    });

  } catch (error) {
    console.error('Get rent records by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's rent records
export const getUserRentRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 12 } = req.query;
    
    // Users can only see their own rent records unless they're managers
    if (req.user.role === 'user' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own rent records'
      });
    }

    const rentRecords = await RentRecord.getUserRentRecords(id, limit, (page - 1) * limit);

    const total = await RentRecord.countDocuments({ user_id: id });

    res.json({
      success: true,
      data: {
        rent_records: rentRecords,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user rent records error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update rent record
export const updateRentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate input
    const { error, value } = updateRentRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const rentRecord = await RentRecord.findOne({ id });
    if (!rentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Rent record not found'
      });
    }

    // Update rent record fields
    const { rent_amount, status } = value;
    if (rent_amount !== undefined) rentRecord.rent_amount = rent_amount;
    if (status !== undefined) rentRecord.status = status;

    await rentRecord.save();

    res.json({
      success: true,
      message: 'Rent record updated successfully',
      data: {
        rent_record: rentRecord.getFormattedInfo()
      }
    });

  } catch (error) {
    console.error('Update rent record error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mark rent as paid (manager approval)
export const markRentAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_reference } = req.body;
    
    if (!paid_amount || !payment_reference) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount and payment reference are required'
      });
    }

    const rentRecord = await RentRecord.findOne({ id });
    if (!rentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Rent record not found'
      });
    }

    if (rentRecord.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Rent record is already marked as paid'
      });
    }

    await rentRecord.markAsPaid(paid_amount, payment_reference);

    res.json({
      success: true,
      message: 'Rent marked as paid successfully',
      data: {
        rent_record: rentRecord.getFormattedInfo()
      }
    });

  } catch (error) {
    console.error('Mark rent as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get overdue rent records
export const getOverdueRentRecords = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const overdueRecords = await RentRecord.getOverdueRentRecords(currentMonth);

    res.json({
      success: true,
      data: {
        current_month: currentMonth,
        overdue_records: overdueRecords,
        total_overdue: overdueRecords.length
      }
    });

  } catch (error) {
    console.error('Get overdue rent records error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get rent payment history
export const getRentPaymentHistory = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    // Build query
    let query = { payment_type: 'rent', status: 'success' };
    
    if (user_id) query.user_id = user_id;
    
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const payments = await Payment.find(query)
      .populate('user_id', 'name email room_number')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: {
        payments,
        total_payments: payments.length,
        total_amount: payments.reduce((sum, payment) => sum + payment.amount, 0)
      }
    });

  } catch (error) {
    console.error('Get rent payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get rent summary for dashboard
export const getRentSummary = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Get current month statistics
    const currentMonthStats = await RentRecord.getRentStatistics(currentMonth);
    
    // Get overdue records
    const overdueRecords = await RentRecord.getOverdueRentRecords(currentMonth);
    
    // Get recent payments
    const recentPayments = await Payment.find({
      payment_type: 'rent',
      status: 'success',
      created_at: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
    })
      .populate('user_id', 'name room_number')
      .sort({ created_at: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        current_month: currentMonth,
        current_month_stats: currentMonthStats,
        overdue_summary: {
          total_overdue: overdueRecords.length,
          total_overdue_amount: overdueRecords.reduce((sum, record) => 
            sum + record.getRemainingAmount(), 0
          ),
          overdue_records: overdueRecords.slice(0, 10) // Limit to 10 for dashboard
        },
        recent_payments
      }
    });

  } catch (error) {
    console.error('Get rent summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
