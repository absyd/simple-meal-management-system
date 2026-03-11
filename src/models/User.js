import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'meal_manager', 'user'],
    default: 'user',
    required: true
  },
  room_number: {
    type: String,
    trim: true,
    maxlength: [20, 'Room number cannot exceed 20 characters']
  },
  is_active: {
    type: Boolean,
    default: true
  },
  password_changed: {
    type: Boolean,
    default: false
  },
  last_password_change: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for better query performance
userSchema.index({ id: 1 });
userSchema.index({ role: 1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  
  try {
    const { getEnvConfig } = await import('../config/database.js');
    const envConfig = getEnvConfig();
    const saltRounds = envConfig.BCRYPT_SALT_ROUNDS || 12;
    
    this.password_hash = await bcrypt.hash(this.password_hash, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Get user's public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password_hash;
  return userObject;
};

// Role-based permission methods
userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

userSchema.methods.isManager = function() {
  return ['admin', 'manager'].includes(this.role);
};

userSchema.methods.isMealManager = function() {
  return ['admin', 'manager', 'meal_manager'].includes(this.role);
};

// Password change requirement method
userSchema.methods.mustChangePassword = function() {
  return !this.password_changed;
};

export const User = mongoose.model('User', userSchema);
