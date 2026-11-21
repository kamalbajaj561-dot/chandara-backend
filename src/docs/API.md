# Chandara Backend API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Security Overview

This API implements comprehensive security measures based on OWASP Top 10 best practices:

### Authentication & Authorization
- **JWT Authentication**: All endpoints require valid JWT tokens (access tokens)
- **Firebase Auth Integration**: User authentication handled via Firebase Auth
- **Role-Based Access Control (RBAC)**: Roles include `viewer`, `creator`, `moderator`, `administrator`
- **Token Expiration**: Access tokens expire in 7 days, refresh tokens in 30 days
- **JWT ID (jti)**: Unique token identifiers for replay protection and device fingerprinting
- **Account Lockout**: Brute force protection on authentication attempts
- **Status Checks**: Suspended/banned users are blocked from accessing the API

### Rate Limiting
- **General Rate Limit**: 100 requests per 15 minutes per IP
- **Strict Rate Limits**: Applied to sensitive endpoints (auth, payments, admin)
- **Role-Based Limits**: Different limits for different user roles
- **Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Input Validation & Sanitization
- **Input Sanitization**: All user inputs are sanitized to prevent XSS attacks
- **NoSQL Injection Prevention**: Blocks MongoDB/NoSQL injection attempts
- **Prototype Pollution Protection**: Removes dangerous prototype keys
- **Strict Validation**: Joi validation with `stripUnknown` and `allowUnknown: false`
- **Type Safety**: TypeScript for compile-time type checking

### Security Headers
- **Helmet**: Production security headers configured
- **Content Security Policy (CSP)**: Strict CSP allowing only trusted sources
- **HSTS**: HTTP Strict Transport Security enabled in production
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer-Policy**: Controls referrer information leakage

### CORS Configuration
- **Origin Whitelist**: Only allowed origins can access the API
- **Credentials Support**: CORS credentials enabled for authenticated requests
- **Environment-based**: Configured via `CORS_ORIGIN` environment variable

### Error Handling
- **Unique Error IDs**: Each error includes a unique identifier for tracking
- **Production Safety**: Stack traces hidden in production
- **Structured Logging**: Security events logged separately
- **No Information Leakage**: Sensitive details never exposed to clients

### Audit Logging
- **Admin Actions**: All admin operations are logged with full context
- **Security Events**: Authentication failures, authorization denials logged
- **IP Tracking**: Request IP addresses logged for security monitoring
- **User Agent Tracking**: Client information logged for forensic analysis

### Streaming Security
- **Token Expiration**: LiveKit tokens expire after 1-2 hours based on role
- **Role-Based Permissions**: Publisher tokens restricted to creators/moderators
- **Room Access Control**: Users can only join authorized rooms

### Payment Security
- **Authentication Required**: All payment endpoints require authentication
- **Ownership Checks**: Users can only access their own payment data
- **Admin Override**: Administrators can access all payment records
- **Validation**: Strict validation on all payment-related data

### Ticket Security
- **Authentication Required**: Ticket operations require authentication
- **Ownership Checks**: Users can only view their own tickets
- **Role-Based Validation**: Only admins/creators can mark tickets as used
- **QR Code Security**: Cryptographically signed ticket validation

### Chat Security
- **Spam Detection**: Automated spam detection and blocking
- **Moderation Tools**: Ban, mute, and shadow-ban capabilities
- **Slow Mode**: Configurable rate limiting per chat room
- **Access Control**: Subscriber-only and followers-only modes

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Health Check

### GET /health

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

---

## Authentication

### POST /auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "displayName": "John Doe"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### POST /auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "displayName": "John Doe"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### POST /auth/refresh

Refresh an expired JWT token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

### POST /auth/logout

Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Users

### GET /users/me

Get the current user's profile (authenticated).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "photoURL": "https://example.com/avatar.jpg",
    "bio": "A bio about me",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "role": "viewer",
    "status": "active",
    "language": "en",
    "country": "US",
    "socialLinks": {
      "twitter": "https://twitter.com/johndoe",
      "instagram": "https://instagram.com/johndoe"
    },
    "followersCount": 10,
    "followingCount": 5,
    "verified": false,
    "trustScore": 85,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /users/me

Update the current user's profile (authenticated).

**Authentication:** Required

**Request Body:**
```json
{
  "username": "johndoe123",
  "displayName": "Jane Doe",
  "photoURL": "https://example.com/new-avatar.jpg",
  "bio": "Updated bio",
  "avatar": "https://example.com/avatar.jpg",
  "banner": "https://example.com/banner.jpg",
  "language": "en",
  "country": "US",
  "socialLinks": {
    "twitter": "https://twitter.com/janedoe",
    "instagram": "https://instagram.com/janedoe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "username": "johndoe123",
    "displayName": "Jane Doe",
    "bio": "Updated bio",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "language": "en",
    "country": "US",
    "socialLinks": {
      "twitter": "https://twitter.com/janedoe",
      "instagram": "https://instagram.com/janedoe"
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

### GET /users/username/:username/availability

Check if a username is available (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

### GET /users/search

Search users by query (public).

**Query Parameters:**
- `query` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "followersCount": 10,
      "verified": false
    }
  ]
}
```

### GET /users/:userId

Get a public user profile by ID (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "bio": "A bio about me",
    "role": "viewer",
    "followersCount": 10,
    "followingCount": 5,
    "verified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /users/username/:username

Get a public user profile by username (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "bio": "A bio about me",
    "role": "viewer",
    "followersCount": 10,
    "followingCount": 5,
    "verified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /users/

List all users (admin only).

**Authentication:** Required (Administrator role)

**Query Parameters:**
- `limit` (optional): Items per page (default: 20, max: 100)
- `offset` (optional): Items to skip (default: 0)
- `status` (optional): Filter by status (active, suspended, banned)
- `role` (optional): Filter by role (viewer, creator, administrator)

**Response:**
```json
{
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "username": "johndoe",
      "displayName": "John Doe",
      "role": "viewer",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### PUT /users/:userId/status

Update user status (admin only).

**Authentication:** Required (Administrator role)

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Status Options:** `active`, `suspended`, `banned`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "status": "suspended",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User status updated successfully"
}
```

### PUT /users/:userId/role

Update user role (admin only).

**Authentication:** Required (Administrator role)

**Request Body:**
```json
{
  "role": "creator"
}
```

**Role Options:** `viewer`, `creator`, `administrator`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "role": "creator",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User role updated successfully"
}
```

### DELETE /users/:userId

Delete a user (admin only).

**Authentication:** Required (Administrator role)

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Creators

### GET /creators/me

Get the current user's creator profile (authenticated, creator only).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "userId": "user-id",
    "username": "creatorname",
    "displayName": "Creator Name",
    "bio": "Creator bio",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "category": "Music",
    "language": "en",
    "country": "US",
    "socialLinks": {
      "twitter": "https://twitter.com/creator",
      "instagram": "https://instagram.com/creator"
    },
    "verified": false,
    "verificationStatus": "pending",
    "featured": false,
    "followersCount": 1000,
    "eventsCount": 50,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /creators

Create a creator profile (authenticated).

**Authentication:** Required

**Request Body:**
```json
{
  "username": "creatorname",
  "displayName": "Creator Name",
  "bio": "Creator bio",
  "avatar": "https://example.com/avatar.jpg",
  "banner": "https://example.com/banner.jpg",
  "category": "Music",
  "language": "en",
  "country": "US",
  "socialLinks": {
    "twitter": "https://twitter.com/creator",
    "instagram": "https://instagram.com/creator"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "userId": "user-id",
    "username": "creatorname",
    "displayName": "Creator Name",
    "bio": "Creator bio",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "category": "Music",
    "language": "en",
    "country": "US",
    "verified": false,
    "verificationStatus": "pending",
    "featured": false,
    "followersCount": 0,
    "eventsCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /creators/username/:username/availability

Check if a creator username is available (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

### GET /creators/search

Search creators by query (public).

**Query Parameters:**
- `query` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-id",
      "username": "creatorname",
      "displayName": "Creator Name",
      "avatar": "https://example.com/avatar.jpg",
      "category": "Music",
      "verified": true,
      "featured": false,
      "followersCount": 1000
    }
  ]
}
```

### GET /creators/featured

Get featured creators (public).

**Query Parameters:**
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-id",
      "username": "creatorname",
      "displayName": "Creator Name",
      "avatar": "https://example.com/avatar.jpg",
      "category": "Music",
      "verified": true,
      "featured": true,
      "followersCount": 1000
    }
  ]
}
```

### GET /creators/category/:category

Get creators by category (public).

**Query Parameters:**
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-id",
      "username": "creatorname",
      "displayName": "Creator Name",
      "avatar": "https://example.com/avatar.jpg",
      "category": "Music",
      "verified": true,
      "followersCount": 1000
    }
  ]
}
```

### GET /creators/

List all creators (paginated, public).

**Query Parameters:**
- `limit` (optional): Items per page (default: 20, max: 100)
- `offset` (optional): Items to skip (default: 0)
- `verified` (optional): Filter by verification status (true/false)
- `featured` (optional): Filter by featured status (true/false)
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-id",
      "username": "creatorname",
      "displayName": "Creator Name",
      "bio": "Creator bio",
      "avatar": "https://example.com/avatar.jpg",
      "banner": "https://example.com/banner.jpg",
      "category": "Music",
      "verified": true,
      "featured": false,
      "followersCount": 1000,
      "eventsCount": 50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /creators/:creatorId

Get a creator by ID (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "userId": "user-id",
    "username": "creatorname",
    "displayName": "Creator Name",
    "bio": "Creator bio",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "category": "Music",
    "language": "en",
    "country": "US",
    "verified": true,
    "featured": false,
    "followersCount": 1000,
    "eventsCount": 50,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /creators/username/:username

Get a creator by username (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "userId": "user-id",
    "username": "creatorname",
    "displayName": "Creator Name",
    "bio": "Creator bio",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "category": "Music",
    "language": "en",
    "country": "US",
    "verified": true,
    "featured": false,
    "followersCount": 1000,
    "eventsCount": 50,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /creators/:creatorId

Update a creator profile (authenticated, requires ownership or admin).

**Authentication:** Required

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "bio": "Updated bio",
  "avatar": "https://example.com/new-avatar.jpg",
  "banner": "https://example.com/new-banner.jpg",
  "category": "Gaming",
  "language": "es",
  "country": "ES",
  "socialLinks": {
    "twitter": "https://twitter.com/updated",
    "instagram": "https://instagram.com/updated"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "displayName": "Updated Name",
    "bio": "Updated bio",
    "avatar": "https://example.com/new-avatar.jpg",
    "banner": "https://example.com/new-banner.jpg",
    "category": "Gaming",
    "language": "es",
    "country": "ES",
    "socialLinks": {
      "twitter": "https://twitter.com/updated",
      "instagram": "https://instagram.com/updated"
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE /creators/:creatorId

Delete a creator profile (authenticated, requires ownership or admin).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Creator profile deleted successfully"
}
```

### POST /creators/:creatorId/verification

Submit a verification request (authenticated, creator only).

**Authentication:** Required (Creator role)

**Request Body:**
```json
{
  "documentType": "passport",
  "documentNumber": "123456789",
  "additionalInfo": "Additional information"
}
```

**Document Types:** `passport`, `id_card`, `driving_license`, `other`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "verificationStatus": "pending",
    "verificationRequest": {
      "documentType": "passport",
      "documentNumber": "123456789",
      "additionalInfo": "Additional information",
      "submittedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Verification request submitted successfully"
}
```

### PUT /creators/:creatorId/verification/approve

Approve a verification request (admin only).

**Authentication:** Required (Administrator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "verified": true,
    "verificationStatus": "approved",
    "verificationRequest": {
      "documentType": "passport",
      "submittedAt": "2024-01-01T00:00:00.000Z",
      "reviewedAt": "2024-01-01T00:00:00.000Z",
      "reviewedBy": "admin-id"
    }
  },
  "message": "Verification approved successfully"
}
```

### PUT /creators/:creatorId/verification/reject

Reject a verification request (admin only).

**Authentication:** Required (Administrator role)

**Request Body:**
```json
{
  "rejectionReason": "Invalid document"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "verificationStatus": "rejected",
    "verificationRequest": {
      "documentType": "passport",
      "submittedAt": "2024-01-01T00:00:00.000Z",
      "reviewedAt": "2024-01-01T00:00:00.000Z",
      "reviewedBy": "admin-id",
      "rejectionReason": "Invalid document"
    }
  },
  "message": "Verification rejected successfully"
}
```

### PUT /creators/:creatorId/featured

Set featured status (admin only).

**Authentication:** Required (Administrator role)

**Request Body:**
```json
{
  "featured": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "creator-id",
    "featured": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Follow

### POST /follow/users/:userId

Follow a user (authenticated).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "follow-id",
    "followerId": "follower-id",
    "followingId": "user-id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User followed successfully"
}
```

### DELETE /follow/users/:userId

Unfollow a user (authenticated).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "unfollowed": true
  },
  "message": "User unfollowed successfully"
}
```

### GET /follow/users/:userId/check

Check if following a user (authenticated).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "following": true
  }
}
```

### GET /follow/users/:userId/followers

Get a user's followers (public).

**Query Parameters:**
- `limit` (optional): Items per page (default: 20, max: 100)
- `offset` (optional): Items to skip (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "user-id",
      "username": "follower1",
      "displayName": "Follower One",
      "avatar": "https://example.com/avatar.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /follow/users/:userId/following

Get a user's following (public).

**Query Parameters:**
- `limit` (optional): Items per page (default: 20, max: 100)
- `offset` (optional): Items to skip (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "user-id",
      "username": "following1",
      "displayName": "Following One",
      "avatar": "https://example.com/avatar.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### GET /follow/users/:userId/followers/count

Get a user's followers count (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 100
  }
}
```

### GET /follow/users/:userId/following/count

Get a user's following count (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 50
  }
}
```

### POST /follow/creators/:creatorId

Follow a creator (authenticated).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "follow-id",
    "followerId": "follower-id",
    "followingId": "creator-user-id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Creator followed successfully"
}
```

### DELETE /follow/creators/:creatorId

Unfollow a creator (authenticated).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "unfollowed": true
  },
  "message": "Creator unfollowed successfully"
}
```

---

## Events

### GET /events

List all events (paginated, public).

**Query Parameters:**
- `limit` (optional): Items per page (default: 20, max: 100)
- `offset` (optional): Items to skip (default: 0)
- `status` (optional): Filter by status (draft, scheduled, live, ended, cancelled)
- `category` (optional): Filter by category (music, sports, gaming, education, entertainment, business, other)
- `featured` (optional): Filter by featured status (true/false)
- `creatorUid` (optional): Filter by creator ID
- `language` (optional): Filter by language (2-letter code)
- `country` (optional): Filter by country (2-letter code)

**Response:**
```json
{
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "tags": ["music", "live"],
      "country": "US",
      "city": "New York",
      "venue": "Madison Square Garden",
      "creatorUid": "creator-id",
      "creatorName": "Creator Name",
      "ticketPrice": 50,
      "currency": "USD",
      "cameraType": "4K",
      "streamType": "live",
      "eventDate": "2024-12-31",
      "eventTime": "20:00",
      "timezone": "America/New_York",
      "duration": 120,
      "status": "scheduled",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "banner": "https://example.com/banner.jpg",
      "capacity": 10000,
      "language": "en",
      "ageRestriction": 18,
      "featured": true,
      "scheduledAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /events/:id

Get an event by ID (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "slug": "event-slug",
    "title": "Event Title",
    "description": "Event description",
    "category": "Music",
    "tags": ["music", "live"],
    "country": "US",
    "city": "New York",
    "venue": "Madison Square Garden",
    "creatorUid": "creator-id",
    "creatorName": "Creator Name",
    "ticketPrice": 50,
    "currency": "USD",
    "cameraType": "4K",
    "streamType": "live",
    "eventDate": "2024-12-31",
    "eventTime": "20:00",
    "timezone": "America/New_York",
    "duration": 120,
    "status": "scheduled",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "banner": "https://example.com/banner.jpg",
    "capacity": 10000,
    "language": "en",
    "ageRestriction": 18,
    "featured": true,
    "scheduledAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /events/slug/:slug

Get an event by slug (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "slug": "event-slug",
    "title": "Event Title",
    "description": "Event description",
    "category": "Music",
    "tags": ["music", "live"],
    "country": "US",
    "city": "New York",
    "venue": "Madison Square Garden",
    "creatorUid": "creator-id",
    "creatorName": "Creator Name",
    "ticketPrice": 50,
    "currency": "USD",
    "cameraType": "4K",
    "streamType": "live",
    "eventDate": "2024-12-31",
    "eventTime": "20:00",
    "timezone": "America/New_York",
    "duration": 120,
    "status": "scheduled",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "banner": "https://example.com/banner.jpg",
    "capacity": 10000,
    "language": "en",
    "ageRestriction": 18,
    "featured": true,
    "scheduledAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /events

Create a new event (requires creator role).

**Authentication:** Required (Creator role)

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "category": "Music",
  "tags": ["music", "live"],
  "country": "US",
  "city": "New York",
  "venue": "Madison Square Garden",
  "ticketPrice": 50,
  "currency": "USD",
  "cameraType": "4K",
  "streamType": "live",
  "eventDate": "2025-12-31",
  "eventTime": "20:00",
  "timezone": "America/New_York",
  "duration": 120,
  "thumbnail": "https://example.com/thumbnail.jpg",
  "banner": "https://example.com/banner.jpg",
  "capacity": 10000,
  "language": "en",
  "ageRestriction": 18,
  "featured": false
}
```

**Category Options:** `music`, `sports`, `gaming`, `education`, `entertainment`, `business`, `other`

**Stream Type Options:** `live`, `vr`, `360`

**Camera Type Options:** `4K`, `1080p`, `720p`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "slug": "event-title",
    "title": "Event Title",
    "description": "Event description",
    "category": "Music",
    "tags": ["music", "live"],
    "country": "US",
    "city": "New York",
    "venue": "Madison Square Garden",
    "creatorUid": "creator-id",
    "creatorName": "Creator Name",
    "ticketPrice": 50,
    "currency": "USD",
    "cameraType": "4K",
    "streamType": "live",
    "eventDate": "2025-12-31",
    "eventTime": "20:00",
    "timezone": "America/New_York",
    "duration": 120,
    "status": "draft",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "banner": "https://example.com/banner.jpg",
    "capacity": 10000,
    "language": "en",
    "ageRestriction": 18,
    "featured": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event created successfully"
}
```

### PUT /events/:id

Update an event (requires creator role and ownership).

**Authentication:** Required (Creator role)

**Request Body:**
```json
{
  "title": "Updated Event Title",
  "description": "Updated description",
  "category": "Music",
  "tags": ["music", "live", "concert"],
  "country": "US",
  "city": "New York",
  "venue": "Updated Venue",
  "ticketPrice": 75,
  "currency": "USD",
  "cameraType": "4K",
  "streamType": "live",
  "eventDate": "2025-12-31",
  "eventTime": "21:00",
  "timezone": "America/New_York",
  "duration": 150,
  "thumbnail": "https://example.com/new-thumbnail.jpg",
  "banner": "https://example.com/new-banner.jpg",
  "capacity": 15000,
  "language": "en",
  "ageRestriction": 21
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "title": "Updated Event Title",
    "description": "Updated description",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event updated successfully"
}
```

### DELETE /events/:id

Delete an event (requires creator role and ownership).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### POST /events/:id/schedule

Schedule a draft event (requires creator role and ownership).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "status": "scheduled",
    "scheduledAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event scheduled successfully"
}
```

### POST /events/:id/start

Start a scheduled event (requires creator role and ownership).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "status": "live",
    "startedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event started successfully"
}
```

### POST /events/:id/end

End a live event (requires creator role and ownership).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "status": "ended",
    "endedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event ended successfully"
}
```

### POST /events/:id/cancel

Cancel an event (requires creator role and ownership).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "status": "cancelled",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event cancelled successfully"
}
```

### GET /events/search

Search events by query (public).

**Query Parameters:**
- `query` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "status": "scheduled",
      "eventDate": "2024-12-31",
      "eventTime": "20:00"
    }
  ]
}
```

### GET /events/featured

Get featured events (public).

**Query Parameters:**
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "featured": true,
      "status": "scheduled",
      "eventDate": "2024-12-31",
      "eventTime": "20:00"
    }
  ]
}
```

### GET /events/live

Get currently live events (public).

**Query Parameters:**
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "status": "live",
      "startedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /events/upcoming

Get upcoming scheduled events (public).

**Query Parameters:**
- `limit` (optional): Max results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "status": "scheduled",
      "scheduledAt": "2024-01-01T00:00:00.000Z",
      "eventDate": "2024-12-31",
      "eventTime": "20:00"
    }
  ]
}
```

### POST /events/tags

Get events by tags (public).

**Request Body:**
```json
{
  "tags": ["music", "live"],
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "tags": ["music", "live"],
      "thumbnail": "https://example.com/thumbnail.jpg",
      "status": "scheduled"
    }
  ]
}
```

### GET /events/creator/:creatorUid

Get events by creator (public).

**Query Parameters:**
- `limit` (optional): Items per page (default: 20, max: 100)
- `offset` (optional): Items to skip (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "event-id",
      "slug": "event-slug",
      "title": "Event Title",
      "description": "Event description",
      "category": "Music",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "status": "scheduled",
      "eventDate": "2024-12-31",
      "eventTime": "20:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### PUT /events/:id/featured

Set featured status (admin only).

**Authentication:** Required (Administrator role)

**Request Body:**
```json
{
  "featured": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "featured": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Featured status updated successfully"
}
```

---

## Streaming

### GET /streams/live

Get all currently live streams (public).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stream-id",
      "streamId": "stream-123",
      "eventId": "event-id",
      "creatorId": "creator-id",
      "roomName": "event-event-id-stream-123",
      "liveKitRoom": "chandara-event-event-id-stream-123",
      "status": "live",
      "publisherConnected": true,
      "viewerCount": 500,
      "peakViewers": 750,
      "recordingEnabled": true,
      "health": "healthy",
      "startedAt": "2024-01-01T00:05:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:10:00.000Z"
    }
  ]
}
```

### GET /streams/:eventId

Get stream information for an event (requires authentication).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "stream-id",
    "streamId": "stream-123",
    "eventId": "event-id",
    "creatorId": "creator-id",
    "roomName": "event-event-id-stream-123",
    "liveKitRoom": "chandara-event-event-id-stream-123",
    "status": "live",
    "publisherConnected": true,
    "viewerCount": 500,
    "peakViewers": 750,
    "recordingEnabled": true,
    "health": "healthy",
    "startedAt": "2024-01-01T00:05:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:10:00.000Z"
  }
}
```

### GET /streams/:eventId/health

Get stream health information (requires authentication).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "health-id",
    "streamId": "stream-123",
    "publisherConnected": true,
    "roomExists": true,
    "viewerCount": 500,
    "reconnectAttempts": 0,
    "heartbeatTimestamp": "2024-01-01T00:10:00.000Z",
    "liveKitAvailable": true,
    "health": "healthy",
    "lastChecked": "2024-01-01T00:10:00.000Z"
  }
}
```

### POST /streams/:eventId/start

Start a stream for an event (requires creator role).

**Authentication:** Required (Creator role)

**Request Body:**
```json
{
  "recordingEnabled": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream-id",
      "streamId": "stream-123",
      "eventId": "event-id",
      "creatorId": "creator-id",
      "roomName": "event-event-id-stream-123",
      "liveKitRoom": "chandara-event-event-id-stream-123",
      "status": "live",
      "publisherConnected": false,
      "viewerCount": 0,
      "peakViewers": 0,
      "recordingEnabled": false,
      "health": "healthy",
      "startedAt": "2024-01-01T00:05:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:05:00.000Z"
    },
    "token": "jwt-token-string"
  },
  "message": "Stream started successfully"
}
```

### POST /streams/:eventId/stop

Stop a stream for an event (requires creator role).

**Authentication:** Required (Creator role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "stream-id",
    "streamId": "stream-123",
    "eventId": "event-id",
    "status": "ended",
    "viewerCount": 500,
    "peakViewers": 750,
    "endedAt": "2024-01-01T01:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  },
  "message": "Stream stopped successfully"
}
```

### POST /streams/:eventId/token

Generate a LiveKit token for a stream (requires authentication).

**Authentication:** Required

**Request Body:**
```json
{
  "role": "publisher"
}
```

**Role Options:**
- `publisher`: Can publish and subscribe (event creator only)
- `subscriber`: Can only subscribe (authenticated viewers)
- `moderator`: Can publish, subscribe, and publish data (moderators)

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-string",
    "url": "wss://livekit-server.com"
  }
}
```

### PUT /streams/:eventId/viewers

Update viewer count for a stream (requires authentication).

**Authentication:** Required

**Request Body:**
```json
{
  "delta": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "stream-id",
    "viewerCount": 501,
    "peakViewers": 751,
    "updatedAt": "2024-01-01T00:10:00.000Z"
  },
  "message": "Viewer count updated successfully"
}
```

### POST /streams/:streamId/join

Join a stream session (requires authentication).

**Authentication:** Required

**Request Body:**
```json
{
  "role": "subscriber"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-id",
    "streamId": "stream-123",
    "userId": "user-id",
    "role": "subscriber",
    "joinedAt": "2024-01-01T00:10:00.000Z"
  },
  "message": "Joined stream successfully"
}
```

### POST /streams/:streamId/leave

Leave a stream session (requires authentication).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-id",
    "streamId": "stream-123",
    "userId": "user-id",
    "role": "subscriber",
    "joinedAt": "2024-01-01T00:10:00.000Z",
    "leftAt": "2024-01-01T00:30:00.000Z",
    "duration": 1200000
  },
  "message": "Left stream successfully"
}
```

### PUT /streams/:streamId/health

Update stream health information (requires authentication, internal use).

**Authentication:** Required

**Request Body:**
```json
{
  "publisherConnected": true,
  "roomExists": true,
  "viewerCount": 500,
  "reconnectAttempts": 0,
  "liveKitAvailable": true,
  "health": "healthy"
}
```

**Health Status Options:**
- `healthy`: Stream is operating normally
- `warning`: Stream has issues but is still functional
- `offline`: Stream is not accessible

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "health-id",
    "streamId": "stream-123",
    "health": "healthy",
    "lastChecked": "2024-01-01T00:10:00.000Z"
  },
  "message": "Stream health updated successfully"
}
```

### POST /streams/:streamId/heartbeat

Record a heartbeat for stream health monitoring (requires authentication, internal use).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Heartbeat recorded successfully"
}
```

---

## Tickets

### GET /tickets

Get current user's tickets.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ticket-id",
      "eventId": "event-id",
      "userId": "user-id",
      "creatorId": "creator-id",
      "quantity": 2,
      "price": 100,
      "currency": "USD",
      "status": "purchased",
      "purchasedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /tickets/:ticketId

Get a ticket by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ticket-id",
    "eventId": "event-id",
    "userId": "user-id",
    "creatorId": "creator-id",
    "quantity": 2,
    "price": 100,
    "currency": "USD",
    "status": "purchased",
    "purchasedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /tickets

Purchase tickets for an event.

**Request Body:**
```json
{
  "eventId": "event-id",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ticket-id",
    "eventId": "event-id",
    "quantity": 2,
    "price": 100,
    "currency": "USD",
    "status": "purchased"
  }
}
```

### PUT /tickets/:ticketId/use

Mark a ticket as used.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ticket-id",
    "status": "used",
    "usedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Orders

### GET /orders

Get current user's orders.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-id",
      "userId": "user-id",
      "eventId": "event-id",
      "eventTitle": "Event Title",
      "tickets": [],
      "totalAmount": 100,
      "currency": "USD",
      "status": "completed",
      "paymentMethod": "stripe",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /orders/:orderId

Get an order by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "userId": "user-id",
    "eventId": "event-id",
    "eventTitle": "Event Title",
    "tickets": [],
    "totalAmount": 100,
    "currency": "USD",
    "status": "completed",
    "paymentMethod": "stripe",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /orders

Create a new order.

**Request Body:**
```json
{
  "eventId": "event-id",
  "tickets": [
    {
      "quantity": 2
    }
  ],
  "paymentMethod": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "status": "pending",
    "totalAmount": 100
  }
}
```

### PUT /orders/:orderId/status

Update order status (admin only).

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "status": "completed"
  }
}
```

---

## Notifications

### GET /notifications

Get current user's notifications.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notification-id",
      "userId": "user-id",
      "type": "event_reminder",
      "title": "Event Starting Soon",
      "body": "Your event will start in 1 hour",
      "data": {
        "eventId": "event-id"
      },
      "read": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### PUT /notifications/:notificationId/read

Mark a notification as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notification-id",
    "read": true
  }
}
```

### PUT /notifications/read-all

Mark all notifications as read.

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### DELETE /notifications/:notificationId

Delete a notification.

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Chat

### GET /chat/messages/:eventId

Get chat messages for an event.

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `before` (optional): Get messages before this timestamp

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "message-id",
      "eventId": "event-id",
      "userId": "user-id",
      "userName": "John Doe",
      "userAvatar": "https://example.com/avatar.jpg",
      "message": "Hello!",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /chat/messages

Send a chat message.

**Request Body:**
```json
{
  "eventId": "event-id",
  "message": "Hello!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "message-id",
    "eventId": "event-id",
    "userId": "user-id",
    "userName": "John Doe",
    "message": "Hello!",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE /chat/messages/:messageId

Delete a chat message (requires ownership or admin).

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

## LiveKit

### POST /livekit/token

Generate a LiveKit access token for streaming.

**Request Body:**
```json
{
  "roomName": "event-id",
  "participantName": "user-id",
  "role": "publisher"
}
```

**Roles:**
- `publisher`: Can publish and subscribe (for creators)
- `subscriber`: Can only subscribe (for viewers)
- `moderator`: Can publish, subscribe, and moderate (for admins)

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "livekit-jwt-token",
    "url": "wss://livekit-server.com"
  }
}
```

---

## Admin

All admin endpoints require administrator role.

### GET /admin/dashboard

Get admin dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10000,
    "totalCreators": 500,
    "totalEvents": 2000,
    "activeStreams": 50,
    "totalRevenue": 50000,
    "monthlyRevenue": 5000
  }
}
```

### GET /admin/users

Get all users (admin only).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status
- `role` (optional): Filter by role

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "viewer",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /admin/creators

Get all creators (admin only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-id",
      "displayName": "Creator Name",
      "verified": true,
      "followersCount": 1000,
      "eventsCount": 50
    }
  ]
}
```

### GET /admin/events

Get all events (admin only).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "title": "Event Title",
      "creatorName": "Creator Name",
      "status": "live",
      "ticketPrice": 50
    }
  ]
}
```

### GET /admin/reports

Get all reports (admin only).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "report-id",
      "reporterId": "user-id",
      "reporterName": "John Doe",
      "targetId": "target-id",
      "targetType": "user",
      "reason": "Inappropriate content",
      "description": "Report description",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### PUT /admin/reports/:reportId/status

Update report status (admin only).

**Request Body:**
```json
{
  "status": "resolved",
  "resolution": "Action taken"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "report-id",
    "status": "resolved",
    "resolution": "Action taken",
    "resolvedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /admin/settings

Get platform settings (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "maintenanceMode": false,
    "registrationEnabled": true,
    "maxEventsPerCreator": 100,
    "maxTicketPrice": 1000
  }
}
```

### PUT /admin/settings

Update platform settings (admin only).

**Request Body:**
```json
{
  "maintenanceMode": false,
  "registrationEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maintenanceMode": false,
    "registrationEnabled": true
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Or for validation errors:

```json
{
  "success": false,
  "errors": {
    "field": ["Error message"]
  }
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Notifications

### GET /notifications

Get user notifications with pagination and filtering.

**Query Parameters:**
- `limit` (optional): Number of notifications to return (default: 50, max: 100)
- `offset` (optional): Number of notifications to skip (default: 0)
- `type` (optional): Filter by notification type (IN_APP, SYSTEM, SECURITY, EVENT, STREAM, TICKET, PAYMENT, REFUND, CHAT, CREATOR, ADMIN)
- `priority` (optional): Filter by priority (low, normal, high, urgent)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "notificationId": "notification123",
      "userId": "user123",
      "type": "EVENT",
      "title": "Event Reminder",
      "message": "Your event starts in 1 hour",
      "data": { "eventId": "event456" },
      "priority": "normal",
      "status": "sent",
      "read": false,
      "readAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": null
    }
  ],
  "total": 5,
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

### GET /notifications/search

Search notifications by title or message content.

**Query Parameters:**
- `q` (required): Search query string
- `limit` (optional): Number of results to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "notificationId": "notification123",
      "userId": "user123",
      "type": "EVENT",
      "title": "Event Reminder",
      "message": "Your event starts in 1 hour",
      "data": { "eventId": "event456" },
      "priority": "normal",
      "status": "sent",
      "read": false,
      "readAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": null
    }
  ]
}
```

### GET /notifications/unread-count

Get the count of unread notifications for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### GET /notifications/:id

Get a single notification by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification123",
    "userId": "user123",
    "type": "EVENT",
    "title": "Event Reminder",
    "message": "Your event starts in 1 hour",
    "data": { "eventId": "event456" },
    "priority": "normal",
    "status": "sent",
    "read": false,
    "readAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": null
  }
}
```

### POST /notifications

Create a new notification. Users can only send notifications to themselves. Admins can send to any user.

**Request Body:**
```json
{
  "targetUserId": "user456",
  "type": "EVENT",
  "title": "Event Reminder",
  "message": "Your event starts in 1 hour",
  "data": { "eventId": "event456" },
  "priority": "normal",
  "expiresAt": "2024-01-02T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification123",
    "userId": "user456",
    "type": "EVENT",
    "title": "Event Reminder",
    "message": "Your event starts in 1 hour",
    "data": { "eventId": "event456" },
    "priority": "normal",
    "status": "sent",
    "read": false,
    "readAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### PUT /notifications/:id/read

Mark a notification as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification123",
    "userId": "user123",
    "type": "EVENT",
    "title": "Event Reminder",
    "message": "Your event starts in 1 hour",
    "data": { "eventId": "event456" },
    "priority": "normal",
    "status": "sent",
    "read": true,
    "readAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": null
  }
}
```

### PUT /notifications/:id/unread

Mark a notification as unread.

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification123",
    "userId": "user123",
    "type": "EVENT",
    "title": "Event Reminder",
    "message": "Your event starts in 1 hour",
    "data": { "eventId": "event456" },
    "priority": "normal",
    "status": "sent",
    "read": false,
    "readAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": null
  }
}
```

### PUT /notifications/read-all

Mark all notifications as read for the authenticated user.

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### DELETE /notifications/:id

Delete a single notification (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### DELETE /notifications

Delete all notifications for the authenticated user.

**Response:**
```json
{
  "success": true,
  "message": "All notifications deleted successfully"
}
```

### GET /notifications/preferences

Get notification preferences for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "inAppEnabled": true,
    "eventNotifications": true,
    "streamNotifications": true,
    "chatNotifications": true,
    "ticketNotifications": true,
    "paymentNotifications": true,
    "creatorNotifications": true,
    "adminNotifications": true,
    "language": "en",
    "timezone": "UTC",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /notifications/preferences

Update notification preferences for the authenticated user.

**Request Body:**
```json
{
  "inAppEnabled": true,
  "eventNotifications": true,
  "streamNotifications": true,
  "chatNotifications": true,
  "ticketNotifications": true,
  "paymentNotifications": true,
  "creatorNotifications": true,
  "adminNotifications": true,
  "language": "en",
  "timezone": "UTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "inAppEnabled": true,
    "eventNotifications": true,
    "streamNotifications": true,
    "chatNotifications": true,
    "ticketNotifications": true,
    "paymentNotifications": true,
    "creatorNotifications": true,
    "adminNotifications": true,
    "language": "en",
    "timezone": "UTC",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Email API

The Email API provides endpoints for sending and managing emails. All email endpoints require authentication.

### POST /email/test

Send a test email. Users can only send test emails to themselves.

**Request:**
```json
{
  "recipient": "user@example.com",
  "template": "welcome",
  "variables": {
    "userName": "John"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emailId": "email123",
    "recipient": "user@example.com",
    "template": "welcome",
    "subject": "Test Email",
    "provider": "Mock",
    "status": "queued",
    "retryCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Test email sent successfully"
}
```

### POST /email/send

Send a single email. Users can only send emails to themselves. Admins can send to any recipient.

**Request:**
```json
{
  "recipient": "user@example.com",
  "template": "welcome",
  "subject": "Welcome to Chandara",
  "variables": {
    "userName": "John"
  },
  "queue": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emailId": "email123",
    "recipient": "user@example.com",
    "template": "welcome",
    "subject": "Welcome to Chandara",
    "provider": "SMTP",
    "status": "queued",
    "retryCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Email queued successfully"
}
```

### POST /email/bulk

Send bulk emails to multiple recipients. Admin only. Maximum 100 recipients per request.

**Request:**
```json
{
  "recipients": ["user1@example.com", "user2@example.com"],
  "template": "admin-announcement",
  "subject": "Important Announcement",
  "variables": {
    "announcementTitle": "New Features",
    "announcementBody": "We have added new features..."
  },
  "queue": true
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "emailId": "email1",
      "recipient": "user1@example.com",
      "template": "admin-announcement",
      "status": "queued"
    },
    {
      "emailId": "email2",
      "recipient": "user2@example.com",
      "template": "admin-announcement",
      "status": "queued"
    }
  ],
  "message": "2 emails queued successfully"
}
```

### GET /email/logs

Get email logs for the authenticated user. Admins can view logs for any user by passing `userId` query parameter.

**Query Parameters:**
- `limit` (optional): Number of results to return (default: 50, max: 100)
- `offset` (optional): Number of results to skip (default: 0)
- `userId` (optional, admin only): User ID to fetch logs for

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "emailId": "email123",
      "recipient": "user@example.com",
      "template": "welcome",
      "subject": "Welcome",
      "provider": "SMTP",
      "status": "sent",
      "retryCount": 0,
      "sentAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

### GET /email/logs/:id

Get a single email log by ID. Users can only view their own email logs.

**Response:**
```json
{
  "success": true,
  "data": {
    "emailId": "email123",
    "recipient": "user@example.com",
    "template": "welcome",
    "subject": "Welcome",
    "provider": "SMTP",
    "status": "sent",
    "retryCount": 0,
    "sentAt": "2024-01-01T00:00:00.000Z",
    "openedAt": "2024-01-01T01:00:00.000Z",
    "clickedAt": "2024-01-01T01:05:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /email/retry/:id

Retry a failed email. Admin only.

**Response:**
```json
{
  "success": true,
  "message": "Failed emails retried successfully"
}
```

### GET /email/statistics

Get email statistics. Users see their own statistics, admins see global statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "sent": 90,
    "failed": 5,
    "queued": 5,
    "opened": 50,
    "clicked": 30
  }
}
```

### POST /email/process-queue

Process queued emails from the Redis queue. Admin only.

**Query Parameters:**
- `batchSize` (optional): Number of emails to process (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 10
  },
  "message": "Processed 10 emails from queue"
}
```

### Email Templates

The following email templates are available:

- `welcome` - Welcome email for new users
- `verify-email` - Email verification
- `password-reset` - Password reset
- `creator-approved` - Creator application approved
- `creator-rejected` - Creator application rejected
- `event-published` - New event published
- `event-cancelled` - Event cancelled
- `payment-success` - Payment successful
- `payment-failed` - Payment failed
- `refund-approved` - Refund approved
- `refund-rejected` - Refund rejected
- `admin-announcement` - Admin announcement

### Template Variables

Common template variables:

- `userName` - User's name
- `creatorName` - Creator's name
- `eventName` - Event name
- `date` - Date
- `time` - Time
- `description` - Description
- `supportEmail` - Support email address
- `platformName` - Platform name
- `orderId` - Order ID
- `amount` - Amount
- `reason` - Reason
- `announcementTitle` - Announcement title
- `announcementBody` - Announcement body
- `verificationUrl` - Verification URL
- `resetUrl` - Password reset URL
- `creatorDashboardUrl` - Creator dashboard URL
- `eventUrl` - Event URL
- `orderUrl` - Order URL
- `platformUrl` - Platform URL

### Email Status Values

- `queued` - Email is queued for sending
- `sent` - Email has been sent
- `failed` - Email sending failed
- `delivered` - Email was delivered
- `bounced` - Email bounced
- `opened` - Email was opened
- `clicked` - Email link was clicked

---

## Push Notifications

### POST /push/register-device

Register a device token for push notifications.

**Request Body:**
```json
{
  "deviceId": "device-unique-id",
  "token": "fcm-device-token",
  "platform": "ios",
  "appVersion": "1.0.0",
  "deviceModel": "iPhone 14",
  "osVersion": "16.0",
  "timezone": "America/New_York",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully"
}
```

### DELETE /push/device/:id

Delete a device token.

**Response:**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

### POST /push/send

Send a push notification to a user.

**Request Body:**
```json
{
  "userId": "user-id",
  "title": "Notification Title",
  "body": "Notification body text",
  "data": {
    "key": "value"
  },
  "priority": "high",
  "ttl": 3600
}
```

**Response:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0
}
```

### POST /push/send-topic

Send a push notification to a topic.

**Request Body:**
```json
{
  "topic": "creator_123",
  "title": "Notification Title",
  "body": "Notification body text",
  "data": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-123"
}
```

### POST /push/test

Send a test push notification to the authenticated user.

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "This is a test"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0
}
```

### GET /push/logs

Get push notification logs for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 50)
- `offset` (optional): Number of logs to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "push-123",
      "title": "Notification Title",
      "body": "Notification body",
      "status": "sent",
      "sentAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100
}
```

### POST /push/schedule

Schedule a push notification for a future time.

**Request Body:**
```json
{
  "userId": "user-id",
  "title": "Scheduled Notification",
  "body": "This will be sent later",
  "scheduledFor": "2024-12-31T23:59:59.000Z",
  "data": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-123",
  "scheduledFor": "2024-12-31T23:59:59.000Z"
}
```

### PUT /push/schedule/:id

Update a scheduled push notification.

**Request Body:**
```json
{
  "title": "Updated Title",
  "body": "Updated body",
  "scheduledFor": "2024-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule updated successfully"
}
```

### DELETE /push/schedule/:id

Cancel a scheduled push notification.

**Response:**
```json
{
  "success": true,
  "message": "Schedule cancelled successfully"
}
```

### GET /push/schedules

Get the authenticated user's scheduled push notifications.

**Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": "notif-123",
      "title": "Scheduled Notification",
      "scheduledFor": "2024-12-31T23:59:59.000Z",
      "status": "pending"
    }
  ]
}
```

### GET /push/devices

Get the authenticated user's registered devices.

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "device-123",
      "platform": "ios",
      "deviceModel": "iPhone 14",
      "lastSeen": "2024-01-01T00:00:00.000Z",
      "active": true
    }
  ],
  "stats": {
    "total": 2,
    "active": 2,
    "byPlatform": {
      "ios": 1,
      "android": 1
    }
  }
}
```

### GET /push/stats

Get scheduler statistics (Admin only).

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalJobs": 1000,
    "pendingJobs": 50,
    "runningJobs": 5,
    "completedJobs": 900,
    "failedJobs": 45,
    "successRate": 95.5
  }
}
```

### POST /push/process-queue

Manually process the push queue (Admin only).

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "failed": 0
}
```

---

## WebSocket Events

### Connection

Connect to the WebSocket server:

```
ws://localhost:3000
```

### Events

#### Client → Server

**join-room**
```json
{
  "roomId": "event-id"
}
```

**leave-room**
```json
{
  "roomId": "event-id"
}
```

**send-message**
```json
{
  "roomId": "event-id",
  "message": {
    "eventId": "event-id",
    "message": "Hello!",
    "userId": "user-id",
    "userName": "John Doe"
  }
}
```

**typing-start**
```json
{
  "roomId": "event-id",
  "userId": "user-id"
}
```

**typing-stop**
```json
{
  "roomId": "event-id",
  "userId": "user-id"
}
```

#### Server → Client

**new-message**
```json
{
  "eventId": "event-id",
  "userId": "user-id",
  "userName": "John Doe",
  "message": "Hello!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**user-typing**
```json
{
  "userId": "user-id"
}
```

**user-stopped-typing**
```json
{
  "userId": "user-id"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window**: 15 minutes
- **Max Requests**: 100 requests per window per IP

---

## Analytics

### GET /analytics/platform

Get platform-wide analytics data.

**Query Parameters:**
- `startDate` (optional): ISO date string (e.g., "2024-01-01")
- `endDate` (optional): ISO date string (e.g., "2024-01-31")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "platform-2024-01-01",
      "date": "2024-01-01",
      "totalUsers": 100,
      "activeUsers": 50,
      "newUsers": 20,
      "totalCreators": 10,
      "activeCreators": 5,
      "totalEvents": 20,
      "activeEvents": 10,
      "totalTicketsSold": 200,
      "totalRevenue": 2000,
      "totalStreamMinutes": 1200,
      "totalMessages": 100,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /analytics/revenue

Get revenue analytics data.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "revenue-2024-01-01",
      "date": "2024-01-01",
      "grossRevenue": 1000,
      "netRevenue": 800,
      "platformFees": 100,
      "taxes": 100,
      "refunds": 0,
      "coupons": 0,
      "averageOrderValue": 100,
      "revenueByEvent": {},
      "revenueByCreator": {},
      "revenueByCountry": {},
      "revenueByCurrency": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /analytics/creator/:id

Get analytics for a specific creator.

**Path Parameters:**
- `id`: Creator ID

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "creator-123-2024-01-01",
      "creatorId": "creator-123",
      "date": "2024-01-01",
      "followers": 100,
      "newFollowers": 10,
      "revenue": 500,
      "ticketsSold": 5,
      "eventsHosted": 2,
      "liveStreams": 2,
      "averageAttendance": 50,
      "totalViews": 100,
      "rating": 4.5,
      "reviewCount": 20,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /analytics/event/:id

Get analytics for a specific event.

**Path Parameters:**
- `id`: Event ID

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 100,
    "uniqueVisitors": 50,
    "registrations": 20,
    "attendance": 15,
    "peakConcurrentViewers": 10,
    "averageWatchTime": 30,
    "retention": 0.8,
    "chatMessages": 50,
    "revenue": 500,
    "conversionRate": 0.25
  }
}
```

### GET /analytics/user

Get user analytics (admin only).

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 10,
    "totalTickets": 5,
    "totalSpent": 500,
    "favoriteCategories": ["music", "sports"]
  }
}
```

### GET /analytics/chat/:eventId

Get chat analytics for an event.

**Path Parameters:**
- `eventId`: Event ID

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMessages": 100,
    "uniqueSenders": 20,
    "averageMessagesPerUser": 5,
    "peakActivity": 50
  }
}
```

### GET /analytics/stream/:eventId

Get streaming analytics for an event.

**Path Parameters:**
- `eventId`: Event ID

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStreams": 5,
    "totalViewers": 100,
    "totalWatchTime": 3000,
    "averageWatchTime": 30
  }
}
```

### GET /analytics/dashboard

Get dashboard summary with key metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 100,
    "activeUsers": 50,
    "totalRevenue": 2000,
    "totalEvents": 20
  }
}
```

### GET /analytics/trends

Get analytics trends over time.

**Query Parameters:**
- `period` (optional): Time period - "7d", "30d", "90d", "1y" (default: "30d")

**Response:**
```json
{
  "success": true,
  "data": {
    "userGrowth": 10,
    "revenueGrowth": 15,
    "eventGrowth": 5
  }
}
```

### POST /analytics/track

Track an analytics event.

**Request Body:**
```json
{
  "eventType": "page_view",
  "data": {
    "page": "/events/123",
    "referrer": "/home"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "event-123"
  }
}
```

**Supported Event Types:**
- `page_view`: Page view tracking
- `ticket_purchase`: Ticket purchase
- `payment`: Payment success/failure
- `refund`: Refund processed
- `follow`: Creator follow
- `unfollow`: Creator unfollow
- `stream_started`: Stream started
- `stream_ended`: Stream ended
- `viewer_joined`: Viewer joined stream
- `viewer_left`: Viewer left stream
- `chat_message`: Chat message sent
- `login`: User login
- `signup`: User signup
- `event_creation`: Event created
- `event_publish`: Event published

---

## Analytics Caching Strategy

The Analytics Engine uses Redis caching to improve performance and reduce database load. Cache keys follow a consistent pattern and have appropriate TTLs based on data volatility.

### Cache TTL Values

- **Platform Dashboard**: 5 minutes (300s)
- **Revenue Dashboard**: 5 minutes (300s)
- **Creator Analytics**: 10 minutes (600s)
- **Event Analytics**: 5 minutes (300s)
- **Streaming Analytics**: 1 minute (60s) - real-time data
- **Chat Analytics**: 1 minute (60s) - real-time data
- **User Analytics**: 10 minutes (600s)
- **Trends**: 15 minutes (900s)
- **Export Metadata**: 1 hour (3600s)
- **Aggregated Hourly**: 1 hour (3600s)
- **Aggregated Daily**: 24 hours (86400s)
- **Aggregated Weekly**: 7 days (604800s)
- **Aggregated Monthly**: 30 days (2592000s)
- **Aggregated Yearly**: 365 days (31536000s)

### Cache Key Patterns

- `analytics:platform:{date}` - Platform dashboard
- `analytics:revenue:{date}` - Revenue dashboard
- `analytics:creator:{creatorId}:{date}` - Creator analytics
- `analytics:event:{eventId}:{date}` - Event analytics
- `analytics:stream:{eventId}:{date}` - Streaming analytics
- `analytics:chat:{eventId}:{date}` - Chat analytics
- `analytics:user:{userId}:{date}` - User analytics
- `analytics:trends:{period}` - Trends data
- `analytics:export:{exportId}` - Export metadata
- `analytics:agg:hourly:{date}:{hour}` - Hourly aggregation
- `analytics:agg:daily:{date}` - Daily aggregation
- `analytics:agg:weekly:{year}:{week}` - Weekly aggregation
- `analytics:agg:monthly:{year}:{month}` - Monthly aggregation
- `analytics:agg:yearly:{year}` - Yearly aggregation

### Cache Invalidation

Cache is automatically invalidated when:
- New analytics events are tracked (relevant entity caches)
- Aggregation jobs complete
- Manual cache refresh is triggered

---

## Analytics Aggregation Schedule

The Analytics Engine uses the existing Scheduler (Phase 8D) to run background aggregation jobs. All aggregation jobs are scheduled using cron expressions.

### Aggregation Schedule

- **Hourly Aggregation**: Runs every hour at the top of the hour (`0 * * * *`)
  - Aggregates analytics events for the previous hour
  - Caches hourly statistics

- **Daily Aggregation**: Runs every day at 1:00 AM UTC (`0 1 * * *`)
  - Aggregates platform, revenue, and creator analytics for the previous day
  - Updates daily analytics collections in Firestore
  - Invalidates daily cache

- **Weekly Aggregation**: Runs every Sunday at 2:00 AM UTC (`0 2 * * 0`)
  - Aggregates weekly summaries from daily data
  - Caches weekly statistics

- **Monthly Aggregation**: Runs on the 1st of every month at 3:00 AM UTC (`0 3 1 * *`)
  - Aggregates monthly summaries from weekly data
  - Caches monthly statistics

- **Yearly Aggregation**: Runs on January 1st at 4:00 AM UTC (`0 4 1 1 *`)
  - Aggregates yearly summaries from monthly data
  - Caches yearly statistics

### Scheduler Integration

The analytics aggregation jobs are registered with the existing `SchedulerService` from Phase 8D. The following job types are registered:

- `analytics_hourly_aggregation`
- `analytics_daily_aggregation`
- `analytics_weekly_aggregation`
- `analytics_monthly_aggregation`
- `analytics_yearly_aggregation`

To schedule all analytics aggregation jobs:
```typescript
await schedulerService.scheduleAnalyticsAggregations();
```

To cancel all analytics aggregation jobs:
```typescript
await schedulerService.cancelAnalyticsAggregations();
```

### Aggregation Data Flow

1. **Event Tracking**: Events are stored in `analytics_events` collection
2. **Hourly Aggregation**: Events are aggregated into hourly statistics and cached
3. **Daily Aggregation**: Hourly data is aggregated into daily analytics for platform, revenue, and creators
4. **Weekly/Monthly/Yearly**: Higher-level aggregations are built from lower-level data

All aggregated data is stored in Firestore collections:
- `analytics_platform` - Platform-wide daily analytics
- `analytics_revenue` - Revenue daily analytics
- `analytics_creator` - Creator daily analytics
- `analytics_daily` - General daily metrics

---

## Admin Dashboard

**Note:** All admin endpoints require administrator role authentication.

### GET /admin/dashboard

Get complete admin dashboard with summary, health, activity, and alerts.

**Response:**
```json
{
  "summary": {
    "totalUsers": 1000,
    "activeUsers": 500,
    "totalCreators": 100,
    "activeCreators": 50,
    "totalEvents": 200,
    "liveEvents": 10,
    "totalRevenue": 50000,
    "monthlyRevenue": 10000,
    "totalTickets": 1000,
    "monthlyTickets": 200,
    "totalStreams": 300,
    "activeStreams": 15,
    "totalMessages": 5000,
    "pendingReports": 5,
    "pendingVerifications": 3,
    "systemStatus": "healthy"
  },
  "platformHealth": {
    "firestore": { "status": "healthy", "latency": 50, "lastCheck": "2024-01-01T00:00:00.000Z" },
    "redis": { "status": "healthy", "latency": 10, "lastCheck": "2024-01-01T00:00:00.000Z" },
    "livekit": { "status": "healthy", "lastCheck": "2024-01-01T00:00:00.000Z" },
    "queue": { "status": "healthy", "lastCheck": "2024-01-01T00:00:00.000Z" },
    "scheduler": { "status": "healthy", "lastCheck": "2024-01-01T00:00:00.000Z" },
    "email": { "status": "healthy", "lastCheck": "2024-01-01T00:00:00.000Z" },
    "push": { "status": "healthy", "lastCheck": "2024-01-01T00:00:00.000Z" },
    "workers": [],
    "system": {
      "cpu": 50,
      "memory": 60,
      "disk": 40,
      "uptime": 3600,
      "loadAverage": [0.5, 0.6, 0.7]
    }
  },
  "recentActivity": [],
  "alerts": []
}
```

### GET /admin/health

Get platform health status.

**Response:** Same as `platformHealth` in dashboard response.

### GET /admin/users/search?query={query}&page={page}&pageSize={pageSize}

Search users by query.

**Query Parameters:**
- `query` (required): Search query
- `page` (optional): Page number, default 1
- `pageSize` (optional): Page size, default 20

**Response:**
```json
{
  "users": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

### POST /admin/users/:userId/suspend

Suspend a user account.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/users/:userId/ban

Ban a user account.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/users/:userId/unban

Unban a user account.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/users/:userId/verify

Verify a user account.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/users/:userId/role

Change user role.

**Request Body:**
```json
{
  "role": "viewer" | "creator" | "administrator"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/creators/:creatorId/approve

Approve creator verification.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/creators/:creatorId/reject

Reject creator verification.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/creators/:creatorId/feature

Feature a creator.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/creators/:creatorId/unfeature

Remove featured status from a creator.

**Response:**
```json
{
  "success": true
}
```

### GET /admin/feature-flags

Get all feature flags.

**Response:**
```json
[]
```

### POST /admin/feature-flags/:flagId/enable

Enable a feature flag.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/feature-flags/:flagId/disable

Disable a feature flag.

**Response:**
```json
{
  "success": true
}
```

### GET /admin/settings?category={category}

Get system settings.

**Query Parameters:**
- `category` (optional): Filter by category (general, platform, streaming, payment, email, push, analytics)

**Response:**
```json
[]
```

### PUT /admin/settings

Update a system setting.

**Request Body:**
```json
{
  "key": "setting_key",
  "value": "setting_value",
  "category": "general",
  "description": "Setting description"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /admin/maintenance

Get maintenance mode status.

**Response:**
```json
{
  "enabled": false,
  "message": "",
  "estimatedEndTime": null,
  "whitelistedAdmins": [],
  "whitelistedIps": []
}
```

### POST /admin/maintenance/enable

Enable maintenance mode.

**Request Body:**
```json
{
  "message": "Maintenance in progress",
  "estimatedEndTime": "2024-01-01T02:00:00.000Z",
  "whitelistedAdmins": ["admin_id_1"],
  "whitelistedIps": ["192.168.1.1"]
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/maintenance/disable

Disable maintenance mode.

**Response:**
```json
{
  "success": true
}
```

### GET /admin/audit?page={page}&pageSize={pageSize}&adminId={adminId}&action={action}&target={target}&startDate={startDate}&endDate={endDate}

Get audit logs with optional filters.

**Query Parameters:**
- `page` (optional): Page number, default 1
- `pageSize` (optional): Page size, default 50
- `adminId` (optional): Filter by admin ID
- `action` (optional): Filter by action
- `target` (optional): Filter by target
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
{
  "logs": [],
  "total": 0,
  "page": 1,
  "pageSize": 50
}
```

### GET /admin/search?query={query}&limit={limit}&type={type}

Global admin search across all entities.

**Query Parameters:**
- `query` (required): Search query
- `limit` (optional): Max results, default 50
- `type` (optional): Filter by type (user, creator, event, order, payment, analytics, audit_logs)

**Response:**
```json
[]
```

### POST /admin/export

Create an export job.

**Request Body:**
```json
{
  "type": "users" | "creators" | "events" | "orders" | "payments" | "analytics" | "audit_logs",
  "format": "csv" | "json" | "xlsx",
  "filters": {}
}
```

**Response:**
```json
{
  "exportId": "export_1234567890_abc123"
}
```

### GET /admin/export/:id

Get export job status.

**Response:**
```json
{
  "id": "export_1234567890_abc123",
  "type": "users",
  "format": "csv",
  "status": "completed",
  "filters": {},
  "requestedBy": "admin_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:05:00.000Z",
  "fileUrl": "https://example.com/export.csv"
}
```

---

## Event Moderation

### POST /admin/events/:eventId/approve

Approve an event for publication.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/reject

Reject an event.

**Request Body:**
```json
{
  "reason": "Inappropriate content"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/feature

Feature an event on the platform.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/unfeature

Remove event from featured events.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/cancel

Cancel an event.

**Request Body:**
```json
{
  "reason": "Low attendance"
}
```

**Response:**
```json
{
  "success": true
}
```

### DELETE /admin/events/:eventId

Delete an event.

**Request Body:**
```json
{
  "reason": "Duplicate event"
}
```

**Response:**
```json
{
  "success": true
}
```

## Stream Moderation

### POST /admin/streams/:streamId/stop

Force stop a live stream.

**Request Body:**
```json
{
  "reason": "Policy violation"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/chat/mute

Mute chat for an event.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/chat/enable

Enable chat for an event.

**Response:**
```json
{
  "success": true
}
```

### DELETE /admin/streams/:streamId

Remove a stream.

**Request Body:**
```json
{
  "reason": "Inappropriate content"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/streams/:streamId/disconnect

Disconnect the stream publisher.

**Request Body:**
```json
{
  "reason": "Technical issue"
}
```

**Response:**
```json
{
  "success": true
}
```

## Chat Moderation

### DELETE /admin/chat/messages/:messageId

Delete a chat message.

**Request Body:**
```json
{
  "reason": "Spam"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/chat/users/:userId/mute

Mute a user in chat.

**Request Body:**
```json
{
  "duration": 3600,
  "reason": "Spamming"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/chat/users/:userId/ban

Ban a user from chat.

**Request Body:**
```json
{
  "reason": "Harassment"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/events/:eventId/chat/users/:userId/shadow-ban

Shadow ban a user in chat.

**Request Body:**
```json
{
  "reason": "Toxic behavior"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/moderator-notes

Add a moderator note to an entity.

**Request Body:**
```json
{
  "targetId": "user123",
  "targetType": "user",
  "note": "Review needed for suspicious activity"
}
```

**Response:**
```json
{
  "success": true
}
```

## Payment Administration

### POST /admin/refunds/:refundId/approve

Approve a refund request.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/refunds/:refundId/reject

Reject a refund request.

**Request Body:**
```json
{
  "reason": "Invalid reason"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/payments/:paymentId/retry

Retry a failed payment.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/payments/:paymentId/failed

Mark a payment as failed.

**Request Body:**
```json
{
  "reason": "Card declined"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/payments/:paymentId/adjust

Manually adjust a payment amount.

**Request Body:**
```json
{
  "adjustmentAmount": 10,
  "reason": "Discount applied"
}
```

**Response:**
```json
{
  "success": true
}
```

## Ticket Administration

### POST /admin/tickets/:ticketId/verify

Verify a ticket.

**Response:**
```json
{
  "success": true
}
```

### POST /admin/tickets/:ticketId/void

Void a ticket.

**Request Body:**
```json
{
  "reason": "Refund requested"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/tickets/:ticketId/reissue

Reissue a ticket.

**Request Body:**
```json
{
  "reason": "Lost ticket"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/tickets/:ticketId/cancel

Cancel a ticket.

**Request Body:**
```json
{
  "reason": "Event cancelled"
}
```

**Response:**
```json
{
  "success": true
}
```

## Coupon Administration

### POST /admin/coupons

Create a new coupon.

**Request Body:**
```json
{
  "code": "SAVE20",
  "type": "percentage",
  "value": 20,
  "maxUses": 100,
  "minPurchase": 10,
  "expiryDate": "2025-12-31T23:59:59Z",
  "creatorId": "optional_creator_id"
}
```

**Response:**
```json
{
  "success": true
}
```

### PUT /admin/coupons/:couponId

Update a coupon.

**Request Body:**
```json
{
  "value": 25,
  "maxUses": 150
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/coupons/:couponId/disable

Disable a coupon.

**Response:**
```json
{
  "success": true
}
```

### DELETE /admin/coupons/:couponId

Delete a coupon.

**Request Body:**
```json
{
  "reason": "No longer needed"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /admin/coupons/:couponId/statistics

Get coupon usage statistics.

**Response:**
```json
{
  "couponId": "coupon123",
  "code": "SAVE20",
  "type": "percentage",
  "value": 20,
  "maxUses": 100,
  "usedCount": 30,
  "remainingUses": 70,
  "expiryDate": "2025-12-31T23:59:59Z",
  "isPlatformCoupon": true
}
```

## Notification Administration

### POST /admin/notifications/broadcast

Broadcast a notification to all users.

**Request Body:**
```json
{
  "title": "Maintenance",
  "message": "Server maintenance in 1 hour"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/notifications/broadcast/email

Broadcast an email to all users.

**Request Body:**
```json
{
  "subject": "Important Update",
  "content": "New features available"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/notifications/broadcast/push

Broadcast a push notification to all users.

**Request Body:**
```json
{
  "title": "New Event",
  "message": "Check out our latest event"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/campaigns

Schedule a notification campaign.

**Request Body:**
```json
{
  "title": "Summer Sale",
  "message": "50% off all events",
  "scheduledFor": "2025-07-01T10:00:00Z",
  "targetAudience": ["user1", "user2"]
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /admin/campaigns/:campaignId/cancel

Cancel a scheduled campaign.

**Request Body:**
```json
{
  "reason": "Rescheduled"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /admin/campaigns/:campaignId/statistics

Get campaign delivery statistics.

**Response:**
```json
{
  "campaignId": "campaign123",
  "status": "sent",
  "scheduledFor": "2025-07-01T10:00:00Z",
  "sentAt": "2025-07-01T10:00:05Z"
}
```

---

Exceeding the rate limit will result in a `429 Too Many Requests` response.
