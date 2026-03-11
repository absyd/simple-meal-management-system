import { User } from '../models/User.js';
import { Wallet } from '../models/Wallet.js';
import { sendWelcomeEmail, generateRandomPassword } from '../services/emailService.js';
import Joi from 'joi';

// Validation schemas
const createUserSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  role: Joi.string().valid('admin', 'manager', 'meal_manager', 'user').required(),
  room_number: Joi.string().max(20).allow('')
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
  role: Joi.string().valid('admin', 'manager', 'meal_manager', 'user'),
  room_number: Joi.string().max(20).allow(''),
  is_active: Joi.boolean()
});

// Get all users (admin/manager only)
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password_hash')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_users: total,
          per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ id }).select('-password_hash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user wallet information
    const wallet = await Wallet.getOrCreateWallet(user.id);

    res.json({
      success: true,
      data: {
        user,
        wallet: wallet.getFormattedInfo()
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new user (admin/manager only)
export const createUser = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, phone, role, room_number } = value;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate random password
    const temporaryPassword = generateRandomPassword();

    // Create new user
    const user = new User({
      name,
      email,
      phone,
      password_hash: temporaryPassword, // Will be hashed by pre-save middleware
      role,
      room_number: room_number || undefined,
      password_changed: false // Force password change on first login
    });

    await user.save();

    // Create wallet for the user
    await Wallet.create({ user_id: user.id, balance: 0 });

    // Send welcome email with temporary password
    try {
      await sendWelcomeEmail(email, name, temporaryPassword);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue with user creation even if email fails
      // In production, you might want to handle this differently
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email with temporary password has been sent.',
      data: {
        user: user.toPublicJSON(),
        note: 'User will be required to change password on first login'
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user (admin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate input
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const user = await User.findOne({ id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id && value.is_active === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Update user fields
    const { name, phone, role, room_number, is_active } = value;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (room_number !== undefined) user.room_number = room_number || undefined;
    if (is_active !== undefined) user.is_active = is_active;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete user (admin only) - Soft delete
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Soft delete by deactivating
    user.is_active = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user statistics (admin/manager only)
export const getUserStatistics = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$is_active', 1, 0] }
          },
          inactive: {
            $sum: { $cond: ['$is_active', 0, 1] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ is_active: true });

    res.json({
      success: true,
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: totalUsers - activeUsers,
        role_breakdown: stats
      }
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
