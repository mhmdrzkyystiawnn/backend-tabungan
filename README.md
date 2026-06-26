# 📱 Tabunganku - Smart Savings Application

A comprehensive savings tracking backend API built with Express.js and Supabase. Track multiple savings goals, record transactions, and manage your finances effectively.

---

## ⭐ Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 💰 **Multiple Savings Goals** - Create and track multiple savings targets
- 📊 **Transaction Management** - Record deposits and withdrawals
- 📈 **Progress Tracking** - Monitor savings progress towards goals
- 🔍 **Advanced Filtering** - Search, sort, and paginate transactions
- ⚡ **Fast & Reliable** - Built with Express.js and Supabase

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account (for production)

### Installation

```bash
# Clone repository
git clone https://github.com/Yinaa0200/Tabunganku.git
cd Tabunganku/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# Server runs on http://localhost:5000
```

### Environment Variables

Create `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=5000
NODE_ENV=development
```

---

## 📚 API Documentation

**See [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) for complete API reference**

### Quick API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |
| `GET` | `/profile` | Get user profile |
| `POST` | `/savings` | Create savings goal |
| `GET` | `/savings` | List all savings |
| `POST` | `/transactions` | Add transaction |
| `GET` | `/transactions` | Get transactions |

**Base URL:** `http://localhost:5000/api`

---

## 🔗 Postman Collection

Import directly into Postman:

1. Download [Tabunganku.postman_collection.json](./Tabunganku.postman_collection.json)
2. Open Postman → Import → Select file
3. Set `base_url` variable to `http://localhost:5000/api`
4. Set `access_token` after login
5. Start testing!

---

## 📋 Tech Stack

- **Backend:** Express.js 5.2.1
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT (ES256)
- **Validation:** Zod
- **Runtime:** Node.js

---

## 🧪 Testing

All 20 API endpoints have been tested and verified working:

- ✅ Authentication (4 endpoints)
- ✅ Profile Management (3 endpoints)
- ✅ Savings Goals (5 endpoints)
- ✅ Transactions (8 endpoints)

**Run tests:**
```bash
npm run test
# or use Postman collection
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/      # HTTP request handlers
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── middlewares/       # Custom middleware
│   ├── validation/       # Zod validation schemas
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration files
│   └── index.js          # Entry point
├── API-DOCUMENTATION.md  # Complete API reference
├── Tabunganku.postman_collection.json  # Postman collection
├── package.json
└── README.md
```

---

## 🔐 Authentication

1. Register or login to get `access_token` and `refresh_token`
2. Include token in request header:
   ```
   Authorization: Bearer {access_token}
   ```
3. Access token expires after 1 hour
4. Use refresh token to get new access token

---

## 📊 API Endpoints (20 Total)

### Authentication (4)
- Register, Login, Refresh Token, Logout

### Profile (3)
- Get Profile, Update Profile, Change Password

### Savings (5)
- Create, Get All, Get Detail, Update, Delete

### Transactions (8)
- Create, Get All, Get Detail, Update, Delete, Get by Savings ID

**Detailed endpoint documentation:** See [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server with auto-reload
npm run test     # Run tests
npm run build    # Build for production
```

### Testing with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","name":"John"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'

# Get profile (with token)
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 Troubleshooting

**Server won't start:**
- Check port 5000 is available
- Verify `.env` file exists and has correct credentials
- Check Node.js version: `node -v`

**Database connection error:**
- Verify Supabase URL and key in `.env`
- Check internet connection
- Ensure Supabase project is active

**Authentication fails:**
- Verify email/password are correct
- Check token hasn't expired
- Use refresh endpoint if token expired

**See [API-DOCUMENTATION.md](./API-DOCUMENTATION.md#troubleshooting) for more troubleshooting tips**

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": { }
}
```

---

## 🚢 Deployment

Ready for deployment on:
- Heroku
- Vercel
- Railway
- Any Node.js hosting

**Environment setup for production:**
1. Set `NODE_ENV=production`
2. Use production Supabase credentials
3. Enable HTTPS
4. Configure CORS properly

---

## 📞 Support & Links

- **GitHub Repository:** https://github.com/Yinaa0200/Tabunganku
- **Report Issues:** https://github.com/Yinaa0200/Tabunganku/issues
- **API Documentation:** [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)

---

## 🎓 Learning Resources

This project demonstrates:
- Express.js REST API patterns
- JWT authentication best practices
- Database design with Supabase
- Input validation with Zod
- Error handling patterns
- Pagination implementation
- Service-Controller-Route architecture

---

## 📄 License

This project is part of an SMK (vocational school) assignment.

---

**Status:** ✅ Production Ready  
**All 20 endpoints tested and verified working**

**Happy saving! 💰**
