# Ticket & Receipt Delivery API Documentation

## Overview

The Ticket & Receipt Delivery API provides endpoints for generating, downloading, and resending tickets and receipts. It includes QR code generation, PDF creation, email delivery with resend cooldowns, and admin functions for delivery tracking.

## Base URL

```
/delivery
```

## Authentication

All endpoints require authentication via the `authMiddleware`. Some endpoints require administrator role.

---

## Endpoints

### Download Ticket PDF

**GET** `/delivery/tickets/:id/download`

Download a ticket PDF for a specific ticket.

**Authentication:** Required (ticket owner or admin)

**Parameters:**
- `id` (path): Ticket ID

**Response:**
- Content-Type: `application/pdf`
- Body: PDF binary data

**Example:**
```bash
curl -X GET "https://api.chandara.com/delivery/tickets/TKT-123/download" \
  -H "Authorization: Bearer {token}"
```

---

### View QR Code

**GET** `/delivery/tickets/:id/qr`

View the QR code for a ticket.

**Authentication:** Required (ticket owner or admin)

**Parameters:**
- `id` (path): Ticket ID

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "ticketId": "TKT-123"
  }
}
```

**Example:**
```bash
curl -X GET "https://api.chandara.com/delivery/tickets/TKT-123/qr" \
  -H "Authorization: Bearer {token}"
```

---

### Download Receipt PDF

**GET** `/delivery/orders/:id/receipt`

Download a receipt PDF for a specific order.

**Authentication:** Required (order owner or admin)

**Parameters:**
- `id` (path): Order ID

**Response:**
- Content-Type: `application/pdf`
- Body: PDF binary data

**Example:**
```bash
curl -X GET "https://api.chandara.com/delivery/orders/ORD-123/receipt" \
  -H "Authorization: Bearer {token}"
```

---

### Resend Ticket Email

**POST** `/delivery/tickets/:id/resend`

Resend the ticket email to the ticket owner or a specified recipient.

**Authentication:** Required (ticket owner only)

**Parameters:**
- `id` (path): Ticket ID

**Request Body:**
```json
{
  "recipient": "new-email@example.com" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deliveryId": "DLV-123"
  },
  "message": "Ticket email resent successfully"
}
```

**Resend Cooldown:** 5 minutes between resends

**Example:**
```bash
curl -X POST "https://api.chandara.com/delivery/tickets/TKT-123/resend" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "new-email@example.com"}'
```

---

### Resend Receipt Email

**POST** `/delivery/orders/:id/resend-receipt`

Resend the receipt email to the order owner or a specified recipient.

**Authentication:** Required (order owner only)

**Parameters:**
- `id` (path): Order ID

**Request Body:**
```json
{
  "recipient": "new-email@example.com" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deliveryId": "DLV-124"
  },
  "message": "Receipt email resent successfully"
}
```

**Resend Cooldown:** 5 minutes between resends

**Example:**
```bash
curl -X POST "https://api.chandara.com/delivery/orders/ORD-123/resend-receipt" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "new-email@example.com"}'
```

---

### View Ticket Online

**GET** `/delivery/tickets/:id/view`

View ticket details online without downloading the PDF.

**Authentication:** Required (ticket owner or admin)

**Parameters:**
- `id` (path): Ticket ID

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": {
      "ticketId": "TKT-123",
      "ticketType": "regular",
      "price": 50,
      "currency": "USD",
      "qrCode": "data:image/png;base64,...",
      "status": "active"
    },
    "order": {
      "orderId": "ORD-123",
      "total": 50,
      "createdAt": "2024-12-20T10:00:00Z"
    },
    "event": {
      "title": "Test Event",
      "eventDate": "2024-12-25",
      "eventTime": "19:00",
      "venue": "Test Venue"
    }
  }
}
```

**Example:**
```bash
curl -X GET "https://api.chandara.com/delivery/tickets/TKT-123/view" \
  -H "Authorization: Bearer {token}"
```

---

### Get Delivery Logs (Admin)

**GET** `/delivery/delivery/logs`

Retrieve delivery logs with optional filtering.

**Authentication:** Required (admin only)

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "deliveryId": "DLV-123",
      "ticketId": "TKT-123",
      "orderId": "ORD-123",
      "userId": "user-123",
      "recipient": "user@example.com",
      "status": "sent",
      "retryCount": 0,
      "provider": "Email",
      "sentAt": "2024-12-20T10:00:00Z",
      "createdAt": "2024-12-20T10:00:00Z",
      "updatedAt": "2024-12-20T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

**Delivery Statuses:**
- `queued`: Email queued for sending
- `sent`: Email sent successfully
- `delivered`: Email delivered to recipient
- `opened`: Email opened by recipient
- `clicked`: Link in email clicked
- `failed`: Email delivery failed

**Example:**
```bash
curl -X GET "https://api.chandara.com/delivery/delivery/logs?userId=user-123&limit=25&offset=0" \
  -H "Authorization: Bearer {admin-token}"
```

---

### Get Delivery Statistics (Admin)

**GET** `/delivery/delivery/statistics`

Retrieve delivery statistics for monitoring and analytics.

**Authentication:** Required (admin only)

**Query Parameters:**
- `userId` (optional): Filter statistics by user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "sent": 80,
    "delivered": 75,
    "failed": 5,
    "opened": 60,
    "clicked": 40
  }
}
```

**Example:**
```bash
curl -X GET "https://api.chandara.com/delivery/delivery/statistics?userId=user-123" \
  -H "Authorization: Bearer {admin-token}"
```

---

### Admin Resend Ticket

**POST** `/delivery/admin/tickets/:id/resend`

Admin function to resend a ticket email to any recipient, bypassing the resend cooldown.

**Authentication:** Required (admin only)

**Parameters:**
- `id` (path): Ticket ID

**Request Body:**
```json
{
  "recipient": "recipient@example.com" // Required
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deliveryId": "DLV-125"
  },
  "message": "Ticket resent successfully"
}
```

**Example:**
```bash
curl -X POST "https://api.chandara.com/delivery/admin/tickets/TKT-123/resend" \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "recipient@example.com"}'
```

---

### Admin Resend Receipt

**POST** `/delivery/admin/orders/:id/resend-receipt`

Admin function to resend a receipt email to any recipient, bypassing the resend cooldown.

**Authentication:** Required (admin only)

**Parameters:**
- `id` (path): Order ID

**Request Body:**
```json
{
  "recipient": "recipient@example.com" // Required
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deliveryId": "DLV-126"
  },
  "message": "Receipt resent successfully"
}
```

**Example:**
```bash
curl -X POST "https://api.chandara.com/delivery/admin/orders/ORD-123/resend-receipt" \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "recipient@example.com"}'
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

**Common Error Codes:**
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource not found)
- `429`: Too Many Requests (resend cooldown)
- `500`: Internal Server Error

---

## Features

### QR Code Generation
- QR codes are signed with a cryptographic signature
- QR payloads include ticket ID, order ID, user ID, event ID, timestamp, and signature
- QR codes expire after 24 hours for security

### PDF Generation
- Tickets include event details, buyer info, QR code, and terms
- Receipts include invoice number, transaction summary, taxes, fees, discounts
- PDFs are cached in Redis for performance

### Email Delivery
- Emails are sent via the existing EmailService
- PDFs are attached to emails
- QR codes are embedded in email templates
- Delivery status is tracked in Firestore

### Resend Cooldown
- Users can resend emails once every 5 minutes
- Cooldown is enforced via Redis caching
- Admins can bypass the cooldown using admin endpoints

### Delivery Tracking
- All delivery attempts are logged to Firestore
- Status updates track sent, delivered, opened, and clicked events
- Failed deliveries can be retried up to 3 times
- Old logs (90+ days) are automatically cleaned up

---

## Rate Limiting

- Resend endpoints have a 5-minute cooldown per ticket/order
- Admin resend endpoints bypass cooldown
- Delivery logs endpoint supports pagination (max 100 results per request)

---

## Caching

- Generated PDFs are cached in Redis with TTL
- QR codes are cached in Redis with TTL
- Resend cooldown is tracked in Redis with 5-minute TTL
- Cache keys are prefixed with `resend:` for cooldown tracking

---

## Security

- All endpoints require authentication
- Ownership verification before downloads and resends
- QR codes are signed and verified
- Admin-only endpoints require administrator role
- Sensitive operations (resend) have cooldowns to prevent spam
