# 📚 Tabunganku API Documentation

**Version:** 1.0.0  
**Base URL (Development):** `http://localhost:5000/api`  
**Base URL (Production):** `https://api.tabunganku.xyz` *(Coming soon)*  
**Last Updated:** 2026-06-26  
**Status:** ✅ Production Ready (All 20 endpoints tested)

---

## 🎯 Quick Start

1. **Register** `POST /auth/register` → Create account
2. **Login** `POST /auth/login` → Get tokens
3. **Authorize** → Add `Authorization: Bearer {token}` header
4. **Start** → Create savings goals, add transactions

---

## 📋 Table of Contents

- [Endpoint Summary](#endpoint-summary)
- [Authentication Flow](#authentication-flow)
- [Getting Started](#getting-started)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Auth Endpoints](#auth-endpoints)
- [Profile Endpoints](#profile-endpoints)
- [Savings Endpoints](#savings-endpoints)
- [Transaction Endpoints](#transaction-endpoints)
- [Common Workflows](#common-workflows)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## 📊 Endpoint Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| **AUTH** | | | |
| `POST` | `/auth/register` | ❌ No | Create new account |
| `POST` | `/auth/login` | ❌ No | Get JWT tokens |
| `POST` | `/auth/refresh` | ❌ No | Refresh expired access token |
| `POST` | `/auth/logout` | ✅ Yes | Logout user |
| **PROFILE** | | | |
| `GET` | `/profile` | ✅ Yes | Get user profile |
| `PUT` | `/profile` | ✅ Yes | Update profile (name, username, avatar) |
| `PUT` | `/profile/password` | ✅ Yes | Change password |
| **SAVINGS** | | | |
| `POST` | `/savings` | ✅ Yes | Create savings goal |
| `GET` | `/savings` | ✅ Yes | Get all savings goals (paginated) |
| `GET` | `/savings/:id` | ✅ Yes | Get savings goal detail |
| `PUT` | `/savings/:id` | ✅ Yes | Update savings goal |
| `DELETE` | `/savings/:id` | ✅ Yes | Delete savings goal |
| **TRANSACTIONS** | | | |
| `POST` | `/transactions` | ✅ Yes | Create transaction (deposit/withdrawal) |
| `GET` | `/transactions` | ✅ Yes | Get all transactions (paginated, filtered) |
| `GET` | `/transactions/:id` | ✅ Yes | Get transaction detail |
| `PATCH` | `/transactions/:id` | ✅ Yes | Update transaction |
| `DELETE` | `/transactions/:id` | ✅ Yes | Delete transaction |
| `GET` | `/savings/:id/transactions` | ✅ Yes | Get transactions for savings goal |

---

## 🔐 Authentication Flow

```
┌─────────────┐
│   Register  │  POST /auth/register (email, password)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Login    │  POST /auth/login (email, password)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Receive JWT Tokens             │
│  - access_token (1 hour)        │
│  - refresh_token (7 days)       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Add Authorization Header       │
│  Authorization: Bearer <token>  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Access Protected APIs          │
│  (Profile, Savings, Transactions)
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Token Expires? (1 hour)        │
│  YES → POST /auth/refresh       │
│  NO  → Continue using          │
└─────────────────────────────────┘
```

### Savings Goal Flow

```
┌──────────────┐
│ Create Goal  │  POST /savings (name, target_amount)
└──────┬───────┘
       │ current_amount = 0
       ▼
┌──────────────────┐
│  Add Deposit     │  POST /transactions (type: deposit)
└──────┬───────────┘
       │ current_amount += amount
       ▼
┌──────────────────┐
│  View History    │  GET /savings/:id/transactions
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Withdraw        │  POST /transactions (type: withdrawal)
└──────┬───────────┘
       │ current_amount -= amount
       ▼
┌──────────────────┐
│  Check Progress  │  GET /savings/:id
└──────────────────┘
```

---

## Getting Started

### Prerequisites
- HTTP Client (Postman, cURL, VS Code REST Client)
- Valid email address
- Node.js backend running
- Port 5000 available

### Running Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

### Base URL
```
http://localhost:5000/api
```

### Content-Type Header
Include for all POST/PUT/PATCH requests:
```
Content-Type: application/json
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation description",
  "data": {
    "field": "value"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": "Field error message"
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": {
    "items": [ /* array */ ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

### HTTP Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| `200` | OK | Success |
| `201` | Created | Resource created |
| `400` | Bad Request | Validation error |
| `401` | Unauthorized | Invalid/expired token |
| `404` | Not Found | Resource doesn't exist |
| `500` | Server Error | Server issue |

---

## Error Handling

### Common Errors

**401 Unauthorized - Token Issues:**
```json
{
  "success": false,
  "message": "Token tidak valid atau sudah kedaluwarsa"
}
```
**Solution:** Re-login or refresh token

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "email": "Email must be valid format",
    "password": "Password must be at least 6 characters"
  }
}
```
**Solution:** Fix field values according to errors object

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource tidak ditemukan"
}
```
**Solution:** Verify ID is correct

---

## 🔑 Auth Endpoints

### 1. Register

**Endpoint:** `POST /auth/register`

**Description:** Create new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Validation:**
- `email`: Required, valid format
- `password`: Required, minimum 6 characters
- `name`: Required, max 255 characters

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "token": "<JWT_ACCESS_TOKEN>",
    "refresh_token": "<REFRESH_TOKEN>",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

**Error Response - Email Already Exists (400):**
```json
{
  "success": false,
  "message": "Email sudah terdaftar"
}
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and get tokens

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation:**
- `email`: Required, valid format
- `password`: Required, minimum 6 characters

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "<JWT_ACCESS_TOKEN>",
    "refresh_token": "<REFRESH_TOKEN>",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

**Error Response - Invalid Credentials (401):**
```json
{
  "success": false,
  "message": "Email atau password salah"
}
```

**Next Steps:**
1. Store `token` and `refresh_token` (localStorage or session)
2. Use `token` in `Authorization: Bearer {token}` header
3. Refresh token before it expires (1 hour)

---

### 3. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Description:** Get new access token when current token expires

**Request Body:**
```json
{
  "refresh_token": "<REFRESH_TOKEN>"
}
```

**Validation:**
- `refresh_token`: Required, must be valid refresh token from login

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<REFRESH_TOKEN>"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Token berhasil diperbarui",
  "data": {
    "token": "<NEW_JWT_ACCESS_TOKEN>",
    "refresh_token": "<REFRESH_TOKEN>"
  }
}
```

**Error Response - Expired Refresh Token (401):**
```json
{
  "success": false,
  "message": "Refresh token invalid atau expired"
}
```

**Token Validity:**
- Access Token: 1 hour
- Refresh Token: 7 days

---

### 4. Logout

**Endpoint:** `POST /auth/logout`

**Description:** End user session and invalidate token

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout berhasil. Hapus token dari client."
}
```

**After Logout:**
1. Delete `token` from storage
2. Delete `refresh_token` from storage
3. Redirect to login page

---

## 👤 Profile Endpoints

### 1. Get Profile

**Endpoint:** `GET /profile`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Request Example:**
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profil user berhasil diambil.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
}
```

---

### 2. Update Profile

**Endpoint:** `PUT /profile`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body (all optional):**
```json
{
  "name": "Jane Doe",
  "username": "janedoe",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Request Example:**
```bash
curl -X PUT http://localhost:5000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "username": "janedoe"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profil berhasil diperbarui.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "Jane Doe",
      "username": "janedoe",
      "avatar": "https://example.com/new-avatar.jpg"
    }
  }
}
```

---

### 3. Change Password

**Endpoint:** `PUT /profile/password`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "old_password": "CurrentPassword123!",
  "new_password": "NewPassword456!"
}
```

**Validation:**
- `old_password`: Required, must match current password
- `new_password`: Required, minimum 6 characters

**Request Example:**
```bash
curl -X PUT http://localhost:5000/api/profile/password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "CurrentPassword123!",
    "new_password": "NewPassword456!"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password berhasil diubah. Silakan login kembali dengan password baru."
}
```

**Error Response - Wrong Old Password (401):**
```json
{
  "success": false,
  "message": "Password lama salah."
}
```

---

## 💰 Savings Endpoints

### 1. Create Savings Goal

**Endpoint:** `POST /savings`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Liburan ke Bali",
  "target_amount": 5000000
}
```

**Validation:**
- `name`: Required, not empty, max 255 characters
- `target_amount`: Required, positive number (> 0)

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/savings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Liburan ke Bali",
    "target_amount": 5000000
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Target tabungan berhasil dibuat!",
  "data": {
    "savings": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Liburan ke Bali",
      "target_amount": 5000000,
      "current_amount": 0,
      "created_at": "2026-06-26T10:30:00Z",
      "updated_at": "2026-06-26T10:30:00Z"
    }
  }
}
```

---

### 2. Get All Savings

**Endpoint:** `GET /savings`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number |
| `limit` | integer | 10 | 100 | Items per page |
| `sort` | string | desc | - | Sort: `asc` or `desc` |
| `search` | string | - | - | Search by name |

**Request Example:**
```bash
curl -X GET "http://localhost:5000/api/savings?page=1&limit=10&sort=desc" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Data tabungan berhasil diambil.",
  "data": {
    "savings": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Liburan ke Bali",
        "target_amount": 5000000,
        "current_amount": 2000000,
        "created_at": "2026-06-26T10:30:00Z",
        "updated_at": "2026-06-26T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Savings Detail

**Endpoint:** `GET /savings/:id`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**URL Parameters:**
- `id`: Savings goal ID (UUID)

**Request Example:**
```bash
curl -X GET http://localhost:5000/api/savings/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Detail tabungan berhasil diambil.",
  "data": {
    "savings": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Liburan ke Bali",
      "target_amount": 5000000,
      "current_amount": 2000000,
      "created_at": "2026-06-26T10:30:00Z",
      "updated_at": "2026-06-26T10:30:00Z"
    }
  }
}
```

---

### 4. Update Savings Goal

**Endpoint:** `PUT /savings/:id`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body (optional):**
```json
{
  "name": "Liburan ke Bali 2027",
  "target_amount": 7000000
}
```

**Request Example:**
```bash
curl -X PUT http://localhost:5000/api/savings/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Liburan ke Bali 2027",
    "target_amount": 7000000
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Target tabungan berhasil diperbarui.",
  "data": {
    "savings": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Liburan ke Bali 2027",
      "target_amount": 7000000,
      "current_amount": 2000000,
      "created_at": "2026-06-26T10:30:00Z",
      "updated_at": "2026-06-26T14:30:00Z"
    }
  }
}
```

---

### 5. Delete Savings Goal

**Endpoint:** `DELETE /savings/:id`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Request Example:**
```bash
curl -X DELETE http://localhost:5000/api/savings/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Target tabungan berhasil dihapus."
}
```

---

## 📊 Transaction Endpoints

### 1. Create Transaction

**Endpoint:** `POST /transactions`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "savings_id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "deposit",
  "amount": 500000,
  "description": "Gaji bulanan"
}
```

**Validation:**
- `savings_id`: Required, must exist
- `type`: Required, `deposit` or `withdrawal`
- `amount`: Required, positive number
- `description`: Optional, max 500 characters

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "savings_id": "550e8400-e29b-41d4-a716-446655440001",
    "type": "deposit",
    "amount": 500000,
    "description": "Gaji bulanan"
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Transaksi berhasil dicatat.",
  "data": {
    "saldo_sekarang": 2500000,
    "detail_transaksi": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "savings_id": "550e8400-e29b-41d4-a716-446655440001",
      "type": "deposit",
      "amount": 500000,
      "description": "Gaji bulanan",
      "created_at": "2026-06-26T10:30:00Z",
      "updated_at": "2026-06-26T10:30:00Z"
    }
  }
}
```

**Error Response - Insufficient Balance (400):**
```json
{
  "success": false,
  "message": "Saldo tabungan tidak mencukupi."
}
```

---

### 2. Get All Transactions

**Endpoint:** `GET /transactions`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number |
| `limit` | integer | 20 | 100 | Items per page |
| `sort` | string | desc | - | Sort: `asc` or `desc` |
| `type` | string | - | - | `deposit` or `withdrawal` |
| `savings_id` | string | - | - | Filter by savings goal |
| `search` | string | - | - | Search description |

**Request Example:**
```bash
curl -X GET "http://localhost:5000/api/transactions?page=1&limit=10&type=deposit" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Riwayat transaksi berhasil diambil.",
  "data": {
    "transactions": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "savings_id": "550e8400-e29b-41d4-a716-446655440001",
        "type": "deposit",
        "amount": 500000,
        "description": "Gaji bulanan",
        "created_at": "2026-06-26T10:30:00Z",
        "updated_at": "2026-06-26T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Transaction Detail

**Endpoint:** `GET /transactions/:id`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Request Example:**
```bash
curl -X GET http://localhost:5000/api/transactions/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Detail transaksi berhasil diambil.",
  "data": {
    "transaction": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "savings_id": "550e8400-e29b-41d4-a716-446655440001",
      "type": "deposit",
      "amount": 500000,
      "description": "Gaji bulanan",
      "created_at": "2026-06-26T10:30:00Z",
      "updated_at": "2026-06-26T10:30:00Z"
    }
  }
}
```

---

### 4. Update Transaction

**Endpoint:** `PATCH /transactions/:id`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body (optional):**
```json
{
  "amount": 600000,
  "description": "Gaji bulanan + bonus"
}
```

**Request Example:**
```bash
curl -X PATCH http://localhost:5000/api/transactions/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 600000,
    "description": "Gaji bulanan + bonus"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Transaksi berhasil diperbarui.",
  "data": {
    "saldo_sekarang": 2600000,
    "detail_transaksi": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "type": "deposit",
      "amount": 600000,
      "description": "Gaji bulanan + bonus",
      "created_at": "2026-06-26T10:30:00Z",
      "updated_at": "2026-06-26T15:30:00Z"
    }
  }
}
```

---

### 5. Delete Transaction

**Endpoint:** `DELETE /transactions/:id`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Request Example:**
```bash
curl -X DELETE http://localhost:5000/api/transactions/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus.",
  "data": {
    "saldo_sekarang": 2000000
  }
}
```

---

### 6. Get Transactions by Savings ID

**Endpoint:** `GET /savings/:id/transactions`

**Headers:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort` | string | desc | Sort: `asc` or `desc` |

**Request Example:**
```bash
curl -X GET "http://localhost:5000/api/savings/550e8400-e29b-41d4-a716-446655440001/transactions?page=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Riwayat transaksi berhasil diambil.",
  "data": {
    "transactions": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "type": "deposit",
        "amount": 500000,
        "description": "Gaji bulanan",
        "created_at": "2026-06-26T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

## 📖 Common Workflows

### Workflow 1: Complete User Setup
```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","name":"John"}'

# 2. Login (save tokens!)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'

# 3. Create first savings goal
curl -X POST http://localhost:5000/api/savings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Liburan","target_amount":5000000}'

# 4. Add deposit
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"savings_id":"GOAL_ID","type":"deposit","amount":500000}'
```

### Workflow 2: Token Refresh
```bash
# When access token expires (401 error)
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'

# Use new token in next request
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer NEW_TOKEN"
```

---

## ✅ Best Practices

### Authentication
- Store tokens securely (use httpOnly cookies in production)
- Always include `Authorization: Bearer {token}` header
- Implement token refresh before expiration
- Clear tokens on logout
- Never expose tokens in logs

### API Usage
- Use pagination for large datasets
- Filter by `savings_id` to reduce data load
- Cache user profile (rarely changes)
- Implement request timeout (5-30 seconds)
- Handle 401 by re-authenticating

### Error Handling
- Always check `success` field
- Display user-friendly error messages
- Log errors for debugging
- Implement retry logic with exponential backoff
- Handle 404 gracefully

---

## 🔧 Troubleshooting

**Q: Getting 401 Unauthorized?**
- Token expired → Call refresh endpoint
- Invalid token → Re-login
- Missing header → Add `Authorization: Bearer {token}`

**Q: Getting 400 Validation Error?**
- Check required fields are provided
- Verify field types match documentation
- Review `errors` object for specific issues

**Q: Getting 404 Not Found?**
- Verify resource ID is correct
- Check resource belongs to your account
- Try GET endpoints to list all resources

**Q: Insufficient balance on withdrawal?**
- Get latest balance with `GET /savings/:id`
- Ensure withdrawal amount ≤ current_amount

**Q: CORS error in browser?**
- Verify correct base URL
- Include `Content-Type: application/json` header
- Check backend is running on port 5000

---

## 📞 Support

- **GitHub:** https://github.com/Yinaa0200/Tabunganku
- **Issues:** https://github.com/Yinaa0200/Tabunganku/issues

---

**Status:** ✅ Production Ready  
**Last Updated:** 2026-06-26  
**All 20 endpoints tested and working!**
