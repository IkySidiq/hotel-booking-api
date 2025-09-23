# Features

- User registration and authentication
- Room management and photo upload
- Room availability tracking
- Hotel booking system with check-in/check-out
- Payment integration with Midtrans
- Review and rating system
- Invoice generation (PDF)
- Hotel profile management
- Caching and rate limiting
- Activity logging and notifications

# Technology Stack

- Node.js
- Hapi.js
- PostgreSQL
- Redis
- JWT (@hapi/jwt)
- Midtrans payment gateway
- PDFKit for invoice generation
- bcrypt for password hashing
- Winston for logging
- RabbitMQ for message queuing
- Nodemon for development

# Hotel Booking API Setup Guide

## Setup Environment Variables
Create a `.env` file in the root directory and fill in your own values:

```
# Server configuration
HOST=localhost
PORT=5000

# PostgreSQL (node-postgres) configuration
PGUSER=your_postgres_user
PGHOST=localhost
PGPASSWORD=your_postgres_password
PGDATABASE=booking_hotel
PGPORT=5432
DATABASE_URL=postgresql://your_postgres_user:your_postgres_password@localhost:5432/booking_hotel

# JWT Tokens
ACCESS_TOKEN_KEY=your_access_token_secret
REFRESH_TOKEN_KEY=your_refresh_token_secret
ACCESS_TOKEN_AGE=1800

# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_PROD_SERVER_KEY=your_midtrans_prod_server_key

MIDTRANS_SANDBOX_URL=https://app.sandbox.midtrans.com/snap/v1/transactions
MIDTRANS_PROD_URL=https://app.midtrans.com/snap/v1/transactions

# Redis Configuration
REDIS_SERVER=localhost
```

## Install Dependencies
```bash
npm install
```

## Database Migration
**Run the migrations:**
```bash
npm run migrate
```

## Running the Server
```bash
npm run start:dev  # development with nodemon
```

## Code Quality
```bash
npm run lint       # check code style with ESLint
```

## Script Overview
* `start:dev` – run server with nodemon for development
* `migrate` – run database migrations
* `lint` – check code style with ESLint

# Hotel Booking API - Endpoints Documentation

## Authentication Endpoints

### Login
- **POST** `/authentications`
- **Description**: User login to get access and refresh tokens
- **Auth**: None
- **Body**: `{ email, password }`

### Refresh Token
- **PUT** `/authentications`
- **Description**: Refresh access token using refresh token
- **Auth**: None
- **Body**: `{ refreshToken }`

### Logout
- **DELETE** `/authentications`
- **Description**: Delete refresh token (logout)
- **Auth**: None
- **Body**: `{ refreshToken }`

## User Management Endpoints

### Register User
- **POST** `/users`
- **Description**: Register new user
- **Auth**: None
- **Body**: `{ fullname, email, contactNumber, password }`

### Get All Users
- **GET** `/users`
- **Description**: Get list of all users (admin only)
- **Auth**: JWT Required

### Get User by ID
- **GET** `/users/{id}`
- **Description**: Get specific user details (admin only)
- **Auth**: JWT Required

### Update User
- **PUT** `/users/{id}`
- **Description**: Update user information (admin only)
- **Auth**: JWT Required
- **Body**: `{ fullname, email, contactNumber, password }`

### Delete User
- **DELETE** `/users/{id}`
- **Description**: Soft delete user (admin only)
- **Auth**: JWT Required

### Change Role to Admin
- **PATCH** `/users/change-role`
- **Description**: Change user role to admin
- **Auth**: JWT Required

## Room Management Endpoints

### Create Room
- **POST** `/rooms`
- **Description**: Create new room (admin only)
- **Auth**: JWT Required
- **Body**: `{ roomType, pricePerNight, capacity, totalRooms, description }`

### Get All Rooms
- **GET** `/rooms`
- **Description**: Get list of rooms with filtering (admin only)
- **Auth**: JWT Required
- **Query**: `roomType, minPrice, maxPrice, capacity`

### Get Room by ID
- **GET** `/rooms/{id}`
- **Description**: Get specific room details (admin only)
- **Auth**: JWT Required

### Update Room
- **PUT** `/rooms/{id}`
- **Description**: Update room information (admin only)
- **Auth**: JWT Required
- **Body**: `{ roomType, pricePerNight, capacity, totalRooms, description }`

### Delete Room
- **DELETE** `/rooms/{id}`
- **Description**: Soft delete room (admin only)
- **Auth**: JWT Required

## Room Pictures Endpoints

### Upload Room Pictures
- **POST** `/rooms/{id}/pictures`
- **Description**: Upload multiple pictures for a room (admin only)
- **Auth**: JWT Required
- **Content-Type**: `multipart/form-data`
- **Body**: `{ fotoSatu, fotoDua, fotoTiga }` (files)

### Get Room Pictures
- **GET** `/rooms/{roomId}/pictures`
- **Description**: Get all pictures for a room (admin only)
- **Auth**: JWT Required

### Delete Specific Picture
- **DELETE** `/rooms/{roomId}/pictures/{pictureId}`
- **Description**: Delete specific room picture (admin only)
- **Auth**: JWT Required

### Delete All Pictures
- **DELETE** `/rooms/{roomId}/pictures`
- **Description**: Delete all pictures for a room (admin only)
- **Auth**: JWT Required

### Set Primary Picture
- **PATCH** `/rooms/pictures/{pictureId}/primary`
- **Description**: Set picture as primary (admin only)
- **Auth**: JWT Required

## Room Availability Endpoints

### Check Room Availability
- **POST** `/rooms/check-availability`
- **Description**: Check room availability for specific dates
- **Auth**: None
- **Body**: `{ roomId, checkInDate, checkOutDate, numberOfRooms }`

### Generate Availability Data
- **POST** `/rooms-availability/generate-availability`
- **Description**: Generate room availability data for next 6 months
- **Auth**: None

## Booking Endpoints

### Create Booking
- **POST** `/bookings`
- **Description**: Create new room booking
- **Auth**: JWT Required
- **Body**: `{ roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest }`

### Get Pending Bookings
- **GET** `/bookings/pending`
- **Description**: Get user's pending payment bookings
- **Auth**: JWT Required

### Get All Bookings
- **GET** `/bookings`
- **Description**: Get all bookings with filtering (admin only)
- **Auth**: JWT Required
- **Query**: `guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd`

### Get Booking by ID
- **GET** `/bookings/{targetId}`
- **Description**: Get specific booking details (admin only)
- **Auth**: JWT Required

### Cancel Booking
- **DELETE** `/bookings/{bookingId}`
- **Description**: Cancel user's booking
- **Auth**: JWT Required

### Check-in Booking
- **PATCH** `/bookings/{bookingId}/check-in`
- **Description**: Check-in guest (admin only)
- **Auth**: JWT Required

### Check-out Booking
- **PATCH** `/bookings/{bookingId}/check-out`
- **Description**: Check-out guest (admin only)
- **Auth**: JWT Required

### Get Snap Token
- **GET** `/bookings/{bookingId}/snap`
- **Description**: Get Midtrans snap token for payment
- **Auth**: JWT Required

### Generate Invoice
- **GET** `/bookings/{bookingId}/invoice`
- **Description**: Generate booking invoice (PDF)
- **Auth**: JWT Required

### Restore Cancelled Booking
- **PATCH** `/bookings/{bookingId}/cancel`
- **Description**: Restore cancelled booking to pending payment
- **Auth**: JWT Required

## Review Endpoints

### Create Review
- **POST** `/rooms/{roomId}/reviews`
- **Description**: Create review for a room (requires completed booking)
- **Auth**: JWT Required
- **Body**: `{ rating, comment }`

### Get Room Reviews
- **GET** `/rooms/{roomId}/reviews`
- **Description**: Get all reviews for a room
- **Auth**: None
- **Query**: `page, limit`

### Get Review by ID
- **GET** `/reviews/{reviewId}`
- **Description**: Get specific review details
- **Auth**: None

### Update Review
- **PUT** `/reviews/{reviewId}`
- **Description**: Update user's review
- **Auth**: JWT Required
- **Body**: `{ rating, comment }`

### Delete Review
- **DELETE** `/reviews/{reviewId}`
- **Description**: Delete user's review
- **Auth**: JWT Required

## Hotel Profile Endpoints

### Get Hotel Profile
- **GET** `/hotel-profile`
- **Description**: Get hotel profile information
- **Auth**: JWT Required

### Create Hotel Profile
- **POST** `/hotel-profile`
- **Description**: Create hotel profile (admin only)
- **Auth**: JWT Required
- **Body**: `{ name, address, city, description, contactNumber, email, rating }`

### Update Hotel Profile
- **PUT** `/hotel-profile`
- **Description**: Update hotel profile (admin only)
- **Auth**: JWT Required
- **Body**: `{ name, address, city, description, contactNumber, email, rating }`

## Webhook Endpoints

### Midtrans Payment Notification
- **POST** `/midtrans/notification`
- **Description**: Handle Midtrans payment notifications
- **Auth**: None
- **Body**: Midtrans notification payload

### Midtrans Webhook (Alternative)
- **POST** `/webhooks/midtrans`
- **Description**: Alternative Midtrans webhook handler
- **Auth**: None
- **Content-Type**: `application/json`

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Optional message",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": "fail",
  "message": "Error message"
}
```

## Authentication
- Most endpoints require JWT authentication
- Include `Authorization: Bearer <token>` in headers
- Admin-only endpoints require admin role verification
- Access token expires in 1800 seconds (30 minutes)
