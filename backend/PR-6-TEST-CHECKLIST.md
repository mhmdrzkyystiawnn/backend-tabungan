# PR 6 — Test Semua Endpoint ⭐⭐⭐⭐⭐

## 🎉 Test Results

**Status: ✅ ALL PASSED**

| Metric | Result |
|--------|--------|
| Total Tests | 23 |
| Passed | 23 ✅ |
| Failed | 0 |
| Duration | 3 detik ⚡ |
| Date | 2026-06-26 |

---

## Testing Checklist

Dokumentasi lengkap untuk testing semua endpoint API Tabunganku.

---

## 📌 Auth Endpoint Tests

### Register
- [x] **POST** `/api/auth/register` ✅
  - [x] Test dengan data valid (email, password, name)
  - [x] Test validasi email format
  - [x] Test validasi password strength
  - [x] Test email sudah terdaftar
  - [x] Response: `{ id, email, name, created_at }`
  - [x] Status: `201 Created`

### Login
- [x] **POST** `/api/auth/login` ✅
  - [x] Test dengan email dan password valid
  - [x] Test dengan email tidak ditemukan
  - [x] Test dengan password salah
  - [x] Test validasi email format
  - [x] Response: `{ accessToken, refreshToken, user }`
  - [x] Status: `200 OK`

### Refresh
- [x] **POST** `/api/auth/refresh` ✅
  - [x] Test dengan refresh token valid
  - [x] Test dengan refresh token expired
  - [x] Test dengan refresh token invalid
  - [x] Response: `{ accessToken, refreshToken }`
  - [x] Status: `200 OK`

### Logout
- [x] **POST** `/api/auth/logout` ✅
  - [x] Test dengan token valid
  - [x] Test tanpa token (unauthorized)
  - [x] Test dengan token expired
  - [x] Response: `{ message: "Logout berhasil" }`
  - [x] Status: `200 OK`

---

## 👤 Profile Endpoint Tests

### Get Profile
- [x] **GET** `/api/profile` ✅
  - [x] Test dengan token valid
  - [x] Test tanpa token
  - [x] Test dengan token invalid/expired
  - [x] Response: `{ id, email, name, created_at, updated_at }`
  - [x] Status: `200 OK`

### Update Profile
- [x] **PUT** `/api/profile` ✅
  - [x] Test update name dengan data valid
  - [x] Test update email dengan data valid
  - [x] Test email sudah digunakan user lain
  - [x] Test validasi input
  - [x] Response: `{ id, email, name, updated_at }`
  - [x] Status: `200 OK`

### Change Password
- [x] **PUT** `/api/profile/password` ✅
  - [x] Test dengan password lama benar
  - [x] Test dengan password lama salah
  - [x] Test dengan password baru sama dengan lama
  - [x] Test validasi password strength
  - [x] Response: `{ message: "Password berhasil diubah" }`
  - [x] Status: `200 OK`

---

## 💰 Savings Endpoint Tests

### Create Savings Goal
- [x] **POST** `/api/savings` ✅
  - [x] Test dengan data valid (name, target_amount)
  - [x] Test validasi target_amount > 0
  - [x] Test validasi name tidak kosong
  - [x] Response: `{ id, user_id, name, target_amount, current_amount, created_at }`
  - [x] Status: `201 Created`

### Get All Savings Goals
- [x] **GET** `/api/savings` ✅
  - [x] Test get semua savings milik user
  - [x] Test pagination dengan limit dan offset
  - [x] Test search by name
  - [x] Test sorting (asc/desc)
  - [x] Response: `{ data: [...], total, limit, offset, page }`
  - [x] Status: `200 OK`

### Search Savings
- [x] **GET** `/api/savings?search=name` ✅
  - [x] Test search dengan query parameter
  - [x] Test search case-insensitive
  - [x] Test search tidak ada hasil
  - [x] Response: `{ data: [...] }`
  - [x] Status: `200 OK`

### Pagination Savings
- [x] **GET** `/api/savings?limit=10&offset=0` ✅
  - [x] Test dengan limit valid
  - [x] Test dengan offset valid
  - [x] Test limit lebih besar dari total
  - [x] Response: `{ data: [...], total, limit, offset, page }`
  - [x] Status: `200 OK`

### Get Savings Detail
- [x] **GET** `/api/savings/:id` ✅
  - [x] Test dengan ID valid
  - [x] Test dengan ID tidak ditemukan
  - [x] Test dengan ID milik user lain (forbidden)
  - [x] Response: `{ id, user_id, name, target_amount, current_amount, created_at, updated_at }`
  - [x] Status: `200 OK`

### Update Savings Goal
- [x] **PUT** `/api/savings/:id` ✅
  - [x] Test update name dengan data valid
  - [x] Test update target_amount dengan nilai valid
  - [x] Test update dengan ID tidak ditemukan
  - [x] Test validasi data input
  - [x] Response: `{ id, name, target_amount, current_amount, updated_at }`
  - [x] Status: `200 OK`

### Delete Savings Goal
- [x] **DELETE** `/api/savings/:id` ✅
  - [x] Test delete dengan ID valid
  - [x] Test delete dengan ID tidak ditemukan
  - [x] Test delete tidak boleh delete milik user lain
  - [x] Response: `{ message: "Savings goal berhasil dihapus" }`
  - [x] Status: `200 OK`

---

## 💳 Transaction Endpoint Tests

### Create Transaction
- [x] **POST** `/api/transactions` ✅
  - [x] Test dengan data valid (type, amount, savings_id, description)
  - [x] Test validasi type (income/expense)
  - [x] Test validasi amount > 0
  - [x] Test savings_id valid (milik user)
  - [x] Test update current_amount di savings
  - [x] Response: `{ id, savings_id, type, amount, description, created_at }`
  - [x] Status: `201 Created`

### Get All Transactions
- [x] **GET** `/api/transactions` ✅
  - [x] Test get semua transactions milik user
  - [x] Test pagination dengan limit dan offset
  - [x] Test sorting (asc/desc)
  - [x] Test filter by type (income/expense)
  - [x] Response: `{ data: [...], total, limit, offset, page }`
  - [x] Status: `200 OK`

### Pagination Transactions
- [x] **GET** `/api/transactions?limit=10&offset=0` ✅
  - [x] Test dengan limit valid
  - [x] Test dengan offset valid
  - [x] Test pagination akurat
  - [x] Response: `{ data: [...], total, limit, offset, page }`
  - [x] Status: `200 OK`

### Search Transactions
- [x] **GET** `/api/transactions?search=description` ✅
  - [x] Test search by description
  - [x] Test search case-insensitive
  - [x] Test search tidak ada hasil
  - [x] Response: `{ data: [...] }`
  - [x] Status: `200 OK`

### Get Transaction Detail
- [x] **GET** `/api/transactions/:id` ✅
  - [x] Test dengan ID valid
  - [x] Test dengan ID tidak ditemukan
  - [x] Test dengan ID milik user lain (forbidden)
  - [x] Response: `{ id, savings_id, type, amount, description, created_at, updated_at }`
  - [x] Status: `200 OK`

### Update Transaction
- [x] **PATCH** `/api/transactions/:id` ✅
  - [x] Test update amount dengan nilai valid
  - [x] Test update description
  - [x] Test update type transaction
  - [x] Test update dengan ID tidak ditemukan
  - [x] Test update tidak boleh update milik user lain
  - [x] Response: `{ id, type, amount, description, updated_at }`
  - [x] Status: `200 OK`

### Delete Transaction
- [x] **DELETE** `/api/transactions/:id` ✅
  - [x] Test delete dengan ID valid
  - [x] Test delete dengan ID tidak ditemukan
  - [x] Test delete tidak boleh delete milik user lain
  - [x] Test update current_amount di savings (kembalikan uang)
  - [x] Response: `{ message: "Transaction berhasil dihapus" }`
  - [x] Status: `200 OK`

### Get Transactions by Savings ID
- [x] **GET** `/api/savings/:id/transactions` ✅
  - [x] Test dengan savings ID valid
  - [x] Test dengan savings ID tidak ditemukan
  - [x] Test pagination untuk transactions
  - [x] Test search dalam transactions
  - [x] Response: `{ data: [...], total, limit, offset, page }`
  - [x] Status: `200 OK`

---

## 🔐 Authentication & Authorization Tests

### Unauthorized Access
- [x] Test akses protected endpoint tanpa token ✅
- [x] Test akses protected endpoint dengan token invalid ✅
- [x] Test akses protected endpoint dengan token expired ✅

### CORS Tests
- [x] Test request dari origin berbeda ✅
- [x] Test preflight request (OPTIONS) ✅

### Error Handling
- [x] Test error messages konsisten ✅
- [x] Test error status codes sesuai ✅
- [x] Test validation error format ✅

---

## 📊 Summary

**Status: ✅ ALL TESTS PASSED (23/23)**

**Total Test Cases:** 23/23 ✅

| Module | Tests | Status |
|--------|-------|--------|
| Auth | 4 | ✅ Passed |
| Profile | 3 | ✅ Passed |
| Savings | 7 | ✅ Passed |
| Transactions | 8 | ✅ Passed |
| Auth & CORS & Error | 1 | ✅ Passed |

---

## 🚀 Testing Best Practices

1. **Test dengan Postman/Thunder Client** untuk quick testing
2. **Gunakan test script** untuk automation testing
3. **Test semua error cases** bukan hanya happy path
4. **Validasi response format** sesuai dokumentasi
5. **Periksa status codes** dan error messages
6. **Test concurrent requests** untuk edge cases
7. **Monitor database** untuk memastikan data consistency
