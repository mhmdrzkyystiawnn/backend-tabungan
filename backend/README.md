# 💰 Tabunganku - Aplikasi Manajemen Tabungan

Aplikasi backend untuk manajemen target tabungan dan transaksi keuangan pribadi yang membantu Anda merencanakan dan melacak tabungan dengan mudah.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js (v5.2.1)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Zod
- **CORS:** Enabled for cross-origin requests
- **Environment:** dotenv

**Dependencies:**
```json
{
  "@supabase/supabase-js": "^2.108.2",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2",
  "express": "^5.2.1",
  "zod": "^4.4.3"
}
```

**DevDependencies:**
```json
{
  "nodemon": "^3.1.14"
}
```

---

## 📁 Folder Structure

```
backend/
├── src/
│   ├── index.js                    # Entry point
│   ├── config/
│   │   └── supabase.js            # Supabase configuration
│   ├── controllers/               # Business logic
│   │   ├── auth.controller.js
│   │   ├── profile.controller.js
│   │   ├── savings.controller.js
│   │   └── transaction.controller.js
│   ├── middlewares/               # Express middlewares
│   │   ├── auth.js                # JWT authentication
│   │   ├── asyncHandler.js        # Async error handling
│   │   ├── errorHandler.js        # Global error handler
│   │   └── validate.js            # Zod validation
│   ├── routes/                    # API routes
│   │   ├── auth.routes.js
│   │   ├── profile.routes.js
│   │   ├── savings.routes.js
│   │   └── transaction.routes.js
│   ├── services/                  # Business logic services
│   │   ├── savings.service.js
│   │   └── transaction.service.js
│   ├── utils/                     # Utility functions
│   │   ├── AppError.js            # Custom error class
│   │   └── response.js            # Response formatter
│   └── validation/                # Zod schemas
│       ├── auth.validation.js
│       ├── profile.validation.js
│       ├── savings.validation.js
│       └── transaction.validation.js
├── package.json
├── .env                           # Environment variables
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Steps

1. **Clone repository**
```bash
git clone https://github.com/Yinaa0200/Tabunganku.git
cd Tabunganku/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

4. **Configure .env file**
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
```

5. **Start development server**
```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

---

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anonymous key |
| `JWT_SECRET` | Secret key untuk JWT signing |
| `JWT_EXPIRE` | Access token expiration (default: 1h) |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration (default: 7d) |

---

## � API Documentation

**✅ Complete API Documentation v1.0.0**

Dokumentasi API yang lengkap dan akurat tersedia di:
- **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** — 20+ halaman dokumentasi

Mencakup:
- ✅ 20 endpoints fully documented dengan contoh request/response
- ✅ Query parameters, validation rules, dan error cases
- ✅ Authentication flow dan security guidelines
- ✅ cURL examples untuk testing
- ✅ Response format documentation
- ✅ Pagination, search, dan filtering guide

---

## 📚 API Endpoints

Base URL: `http://localhost:5000/api` (Port 5000)

### Authentication
- `POST /auth/register` - Register user baru
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Profile
- `GET /profile` - Get profile user
- `PUT /profile` - Update profile
- `PUT /profile/password` - Change password

### Savings Goals
- `POST /savings` - Create savings goal
- `GET /savings` - Get all savings (dengan pagination & search)
- `GET /savings/:id` - Get savings detail
- `PUT /savings/:id` - Update savings goal
- `DELETE /savings/:id` - Delete savings goal

### Transactions
- `POST /transactions` - Create transaction (deposit/withdrawal)
- `GET /transactions` - Get all transactions (pagination, filtering, search)
- `GET /transactions/:id` - Get transaction detail
- `PATCH /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction (auto adjust balance)
- `GET /savings/:id/transactions` - Get transactions for specific savings goal

📖 **Lihat [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) untuk dokumentasi LENGKAP (20 halaman, semua endpoint dengan contoh)**

---

## 🗄️ Database Schema (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                          users                                  │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                                   │
│ email (VARCHAR, UNIQUE)                                         │
│ name (VARCHAR)                                                  │
│ password_hash (VARCHAR)                                         │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
            ↓ (1:N)
┌─────────────────────────────────────────────────────────────────┐
│                      savings_goals                              │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                                   │
│ user_id (UUID, FK → users.id)                                   │
│ name (VARCHAR)                                                  │
│ target_amount (NUMERIC)                                         │
│ current_amount (NUMERIC, DEFAULT: 0)                            │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
            ↓ (1:N)
┌─────────────────────────────────────────────────────────────────┐
│                      transactions                               │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                                   │
│ savings_id (UUID, FK → savings_goals.id)                        │
│ type (ENUM: 'income', 'expense')                                │
│ amount (NUMERIC)                                                │
│ description (VARCHAR)                                           │
│ created_at (TIMESTAMP)                                          │
│ updated_at (TIMESTAMP)                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship
- **users → savings_goals**: One user has many savings goals
- **savings_goals → transactions**: One savings goal has many transactions

---

## 🔐 Authentication & Security

### JWT Flow
1. User login dengan email dan password
2. Server mengirimkan `accessToken` dan `refreshToken`
3. Client menyimpan token (preferably in secure storage)
4. Setiap request protected endpoint, sertakan token di header:
   ```
   Authorization: Bearer <accessToken>
   ```
5. Jika token expired, gunakan refresh token untuk mendapat token baru

### Password Security
- Password di-hash menggunakan bcrypt
- Minimum password requirements divalidasi
- Password change memerlukan password lama yang benar

### CORS
- Enabled untuk development
- Dapat dikonfigurasi untuk production

---

## ✨ Features

### Authentication
- ✅ User registration dengan validasi email
- ✅ Login dengan JWT tokens
- ✅ Refresh token mechanism
- ✅ Logout functionality
- ✅ Password hashing dengan bcrypt

### Profile Management
- ✅ View user profile
- ✅ Update profile (name, email)
- ✅ Change password dengan verification

### Savings Goals
- ✅ Create multiple savings goals
- ✅ View all savings goals dengan pagination
- ✅ Search savings goals by name
- ✅ View savings goal detail
- ✅ Update savings goal
- ✅ Delete savings goal
- ✅ Auto calculate current_amount dari transactions

### Transactions
- ✅ Create transaction (income/expense)
- ✅ View all transactions dengan pagination
- ✅ Search transactions by description
- ✅ View transaction detail
- ✅ Update transaction
- ✅ Delete transaction
- ✅ View transactions per savings goal
- ✅ Auto update savings goal amount

### Data Management
- ✅ Input validation menggunakan Zod
- ✅ Error handling yang konsisten
- ✅ Pagination support
- ✅ Search functionality
- ✅ Sorting capabilities

---

## 📝 Testing

Untuk testing semua endpoint, lihat [PR-6-TEST-CHECKLIST.md](./PR-6-TEST-CHECKLIST.md)

### Tools untuk Testing
- Postman
- Thunder Client
- Insomnia
- cURL

### Example cURL

Register:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Get Profile (dengan token):
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer <accessToken>"
```

---

## 🐛 Error Handling

API menggunakan standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (no access) |
| `404` | Not Found |
| `500` | Internal Server Error |

Error response format:
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

---

## 🚀 Deployment

### Heroku
```bash
heroku login
heroku create your-app-name
git push heroku main
heroku config:set JWT_SECRET=your_secret_key
```

### Vercel (Serverless)
```bash
vercel deploy
```

### Docker
```bash
docker build -t tabunganku .
docker run -p 3000:3000 tabunganku
```

---

## 📞 Support & Contributing

- **Issues:** GitHub Issues
- **Pull Requests:** Contributions welcome!
- **Questions:** Buka discussion di GitHub

---

## 📄 License

ISC License - Lihat LICENSE file untuk detail

---

## 👨‍💻 Author

Created with ❤️ by [Your Name]

---

## 🔄 Project Progress

- ✅ Backend API Development
- ⏳ Frontend React Development (Coming Soon)
- ⏳ Mobile App Development (Coming Soon)
- ⏳ Advanced Analytics Dashboard (Future)

---

## 📚 Related Documentation

- [API Documentation](./API-DOCUMENTATION.md)
- [Test Checklist](./PR-6-TEST-CHECKLIST.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com)

---

**Happy Saving! 💰**
