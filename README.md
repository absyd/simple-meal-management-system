# Simple Meal Management System

A comprehensive hostel meal management system that handles meal tracking, rent management, and online payments for multi-role hostel environments.

## Overview

This system provides a complete solution for managing hostel operations with four-layer architecture:

**Client → API → Business Logic → Database → Payment Gateway**

The system supports multiple user roles with different permissions, automated meal tracking, rent management, and seamless online payment integration.

## Features

### Core Functionality
- **Multi-role User Management** (Admin, Manager, Meal Manager, User)
- **Daily Meal Tracking** (Breakfast, Lunch, Dinner)
- **Automated Billing System** with wallet balance management
- **Online Payment Integration** (SSLCommerz/Stripe)
- **Rent Management** with monthly tracking
- **Financial Reporting** and analytics
- **Real-time Dashboard** for meal counts and user statistics

### User Roles & Permissions

#### Admin
- Full system control
- Manager management
- Financial reports access
- System configuration

#### Manager
- User management
- Rent management
- Payment approval
- Financial summaries

#### Meal Manager
- Daily meal management
- Meal count updates
- Meal reports access

#### User
- Meal history viewing
- Balance checking
- Online payments
- Rent and meal summaries

## Technology Stack

### Backend
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MongoDB
- **ORM**: Mongoose
- **Authentication**: JWT
- **Payment Gateway**: SSLCommerz or Stripe

### Development
- **Language**: JavaScript/TypeScript
- **Development Server**: Nodemon
- **Package Manager**: npm

## Database Schema

### Core Collections

#### Users
```javascript
{
  id: uuid,
  name: String,
  email: String,
  phone: String,
  password_hash: String,
  role: 'admin' | 'manager' | 'meal_manager' | 'user',
  room_number: String,
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### Meals
```javascript
{
  id: uuid,
  date: Date,
  meal_type: 'breakfast' | 'lunch' | 'dinner',
  price: Number,
  created_by: uuid,
  created_at: Date
}
```

#### Meal Consumption
```javascript
{
  id: uuid,
  user_id: uuid,
  meal_id: uuid,
  quantity: Number,
  total_price: Number,
  recorded_by: uuid,
  created_at: Date
}
```

#### Wallet & Transactions
```javascript
// Wallet
{
  id: uuid,
  user_id: uuid,
  balance: Number,
  updated_at: Date
}

// Wallet Transactions
{
  id: uuid,
  wallet_id: uuid,
  amount: Number,
  type: 'credit' | 'debit',
  source: 'meal' | 'rent' | 'payment',
  reference_id: uuid,
  created_at: Date
}
```

#### Payments
```javascript
{
  id: uuid,
  user_id: uuid,
  amount: Number,
  payment_type: 'meal' | 'rent' | 'deposit',
  method: 'online' | 'cash',
  status: 'pending' | 'success' | 'failed',
  gateway: String,
  transaction_id: String,
  created_at: Date
}
```

#### Rent Records
```javascript
{
  id: uuid,
  user_id: uuid,
  month: String,
  rent_amount: Number,
  status: 'pending' | 'paid',
  created_at: Date
}
```

## API Endpoints

### Authentication
```
POST /auth/login
POST /auth/register
```

### Users
```
GET /users
POST /users
PATCH /users/:id
```

### Meals
```
GET /meals
POST /meals
PATCH /meals/:id
```

### Meal Consumption
```
POST /meal-consumption
GET /meal-consumption/user/:id
```

### Payments
```
POST /payments/create
POST /payments/webhook
GET /payments/history
```

### Rent
```
POST /rent
GET /rent/monthly
```

### Reports
```
GET /reports/monthly-meals
GET /reports/finance
```

## Payment Flow

### Online Payment Process
1. **Initiation**: User requests payment via `/payments/create`
2. **Gateway Redirect**: User is redirected to payment gateway
3. **Processing**: Payment gateway processes payment (bKash, Nagad, Card)
4. **Webhook**: Gateway calls `/payments/webhook` with payment status
5. **Completion**: System updates wallet balance and creates transaction record

### Security Features
- Payment gateway signature verification
- Atomic database transactions
- Double-charge prevention
- Secure webhook handling

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Installation Steps
```bash
# Clone the repository
git clone <repository-url>
cd simple-meal-management-system

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.json
# Edit .env.json with your configuration

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Configuration
Create `.env.json` with:
```json
{
  "PORT": 3000,
  "MONGODB_URI": "mongodb://localhost:27017/meal-management",
  "JWT_SECRET": "your-jwt-secret",
  "PAYMENT_GATEWAY": {
    "SSLCOMMERZ": {
      "STORE_ID": "your-store-id",
      "STORE_PASSWORD": "your-store-password"
    }
  }
}
```

## Key Features Explained

### 1. Daily Meal Dashboard
- Real-time meal counts (Breakfast, Lunch, Dinner)
- Kitchen planning assistance
- User participation tracking

### 2. User Meal History
- Detailed meal consumption records
- Price tracking
- Balance updates
- Monthly summaries

### 3. Financial Management
- Automated wallet system
- Transaction history
- Monthly rent tracking
- Payment processing

### 4. Reporting System
- Monthly meal reports
- Financial summaries
- User activity analytics
- Manager dashboards

## Security Considerations

- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control (RBAC)
- **Password Security**: bcrypt hashing
- **Payment Security**: Gateway signature verification
- **Data Integrity**: Atomic transactions for financial operations
- **API Security**: Input validation and sanitization

## Scalability Features

The architecture supports:
- **500+ residents** without performance degradation
- **Redis caching** for frequently accessed data
- **Queue-based payment processing**
- **Analytics services** for business intelligence
- **Mobile app compatibility**

## Development Workflow

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Production Deployment
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - see LICENSE file for details

## Author

Abu Sayed

---

This system provides a robust foundation for hostel meal management with room for growth and customization based on specific requirements. 