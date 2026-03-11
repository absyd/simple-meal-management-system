import express from 'express';
import { connectDB } from './config/database.js';
import {
  authRoutes,
  userRoutes,
  mealRoutes,
  mealConsumptionRoutes,
  paymentRoutes,
  rentRoutes,
  reportsRoutes
} from './routes/index.js';
import {
  securityHeaders,
  corsMiddleware,
  rateLimiter,
  authRateLimiter,
  paymentRateLimiter,
  requestLogger,
  errorHandler,
  notFoundHandler
} from './middleware/security.js';

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/meal-consumption', mealConsumptionRoutes);
app.use('/api/payments', paymentRateLimiter, paymentRoutes);
app.use('/api/rent', rentRoutes);
app.use('/api/reports', reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Simple Meal Management System API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      meals: '/api/meals',
      mealConsumption: '/api/meal-consumption',
      payments: '/api/payments',
      rent: '/api/rent',
      reports: '/api/reports'
    }
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;