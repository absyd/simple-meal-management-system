# Simple Meal Management System API Documentation

## Overview

This API provides a complete solution for managing hostel meal operations, including user management, meal tracking, rent management, and online payments.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- **admin**: Full system control
- **manager**: User management, rent management, payment approval
- **meal_manager**: Daily meal management, meal count updates
- **user**: View meal history, balance, make payments

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+8801000000000",
  "password": "password123",
  "role": "user",
  "room_number": "A101"
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "+8801000000001",
  "room_number": "A102"
}
```

#### Change Password
```http
PUT /auth/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

### Users

#### Get All Users (Manager+)
```http
GET /users?page=1&limit=20&role=user&search=john
Authorization: Bearer <token>
```

#### Get User by ID (Manager+)
```http
GET /users/:id
Authorization: Bearer <token>
```

#### Create User (Admin only)
```http
POST /users
Authorization: Bearer <token>
```

#### Update User (Admin only)
```http
PATCH /users/:id
Authorization: Bearer <token>
```

#### Delete User (Admin only)
```http
DELETE /users/:id
Authorization: Bearer <token>
```

#### Get User Statistics (Manager+)
```http
GET /users/statistics
Authorization: Bearer <token>
```

### Meals

#### Get All Meals (Meal Manager+)
```http
GET /meals?page=1&limit=20&meal_type=lunch&today=true
Authorization: Bearer <token>
```

#### Get Meal by ID (Meal Manager+)
```http
GET /meals/:id
Authorization: Bearer <token>
```

#### Create Meal (Meal Manager+)
```http
POST /meals
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-01-15T00:00:00.000Z",
  "meal_type": "lunch",
  "price": 60
}
```

#### Update Meal (Meal Manager+)
```http
PATCH /meals/:id
Authorization: Bearer <token>
```

#### Delete Meal (Meal Manager+)
```http
DELETE /meals/:id
Authorization: Bearer <token>
```

#### Get Today's Meals Summary
```http
GET /meals/today/summary
Authorization: Bearer <token>
```

### Meal Consumption

#### Record Meal Consumption (Meal Manager+)
```http
POST /meal-consumption
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "meal_id": "meal-uuid",
  "user_id": "user-uuid",
  "quantity": 1
}
```

#### Get User Meal History
```http
GET /meal-consumption/user/:id?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Consumption by Meal (Meal Manager+)
```http
GET /meal-consumption/meal/:meal_id
Authorization: Bearer <token>
```

#### Get Daily Consumption Summary (Meal Manager+)
```http
GET /meal-consumption/daily-summary?date=2024-01-15
Authorization: Bearer <token>
```

#### Delete Meal Consumption (Admin only)
```http
DELETE /meal-consumption/:id
Authorization: Bearer <token>
```

### Payments

#### Create Online Payment
```http
POST /payments/create
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 2000,
  "payment_type": "deposit"
}
```

#### Get Payment History
```http
GET /payments/history?page=1&limit=20&status=success
Authorization: Bearer <token>
```

#### Get All Payments (Manager+)
```http
GET /payments/all?page=1&limit=20&payment_type=meal
Authorization: Bearer <token>
```

### Rent

#### Create Rent Record (Manager+)
```http
POST /rent
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "month": "2024-01",
  "rent_amount": 5000
}
```

#### Get Rent Records by Month (Manager+)
```http
GET /rent/monthly?month=2024-01
Authorization: Bearer <token>
```

#### Get User Rent Records
```http
GET /rent/user/:id?page=1&limit=12
Authorization: Bearer <token>
```

#### Update Rent Record (Manager+)
```http
PATCH /rent/:id
Authorization: Bearer <token>
```

#### Mark Rent as Paid (Manager+)
```http
PATCH /rent/:id/mark-paid
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "paid_amount": 5000,
  "payment_reference": "payment-uuid"
}
```

#### Get Overdue Rent Records (Manager+)
```http
GET /rent/overdue
Authorization: Bearer <token>
```

#### Get Rent Summary (Manager+)
```http
GET /rent/summary
Authorization: Bearer <token>
```

### Reports

#### Get Dashboard Analytics (Manager+)
```http
GET /reports/dashboard
Authorization: Bearer <token>
```

#### Get Monthly Meal Reports (Manager+)
```http
GET /reports/monthly-meals?year=2024&month=01
Authorization: Bearer <token>
```

#### Get Financial Reports (Manager+)
```http
GET /reports/finance?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

#### Get User Reports
```http
GET /reports/user/:id?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Rate Limiting

- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Payment endpoints: 10 requests per minute

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.json`

3. Start MongoDB server

4. Create default admin user:
```bash
npm run setup:admin
```

5. Create sample users (optional):
```bash
npm run setup:sample
```

6. Start the development server:
```bash
npm run dev
```

## Default Credentials

After running the setup script:

- **Admin**: admin@hostel.com / admin123
- **Sample User**: john@hostel.com / user123
- **Manager**: mike@hostel.com / manager123
- **Meal Manager**: sarah@hostel.com / meal123

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Security headers
- Input validation

## Payment Integration

The system integrates with SSLCommerz for online payments. The payment flow includes:

1. User initiates payment
2. System creates payment record
3. User is redirected to SSLCommerz
4. Payment gateway processes payment
5. Webhook notifies system of payment status
6. System updates wallet balance automatically

## Database Schema

The system uses MongoDB with the following main collections:

- `users` - User accounts and roles
- `meals` - Meal definitions and pricing
- `meal_consumptions` - Track who ate what
- `wallets` - User wallet balances
- `wallet_transactions` - Financial transaction ledger
- `payments` - Payment records and status
- `rent_records` - Monthly rent tracking

## Error Handling

The API includes comprehensive error handling with:

- Validation errors with detailed messages
- Database error handling
- Authentication and authorization errors
- Graceful degradation for external service failures
- Detailed logging for debugging

## Development

For development with hot reload:

```bash
npm run dev
```

For production deployment:

```bash
npm start
```
