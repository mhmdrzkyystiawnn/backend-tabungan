# Tabunganku

Tabunganku adalah aplikasi manajemen tabungan pribadi dan kelompok, dengan backend berbasis Express.js dan Supabase. Proyek ini mendukung fitur autentikasi, profil pengguna, tabungan pribadi, transaksi, dasbor ringkasan, serta tabungan bersama dan transaksi bersama.

## Struktur Proyek

- `backend/`
  - `src/`
    - `app.js` - konfigurasi Express dan route utama
    - `index.js` - entrypoint server
    - `config/` - konfigurasi Supabase
    - `controllers/` - logika endpoint
    - `routes/` - definisi rute API dan dokumentasi Swagger
    - `services/` - akses data dan logika bisnis ke Supabase
    - `middlewares/` - middleware autentikasi, validasi, error handling
    - `docs/swagger.js` - konfigurasi Swagger API docs
    - `validation/` - schema Zod untuk request validation
    - `utils/` - helper response dan error

## Teknologi Utama

- Node.js
- Express.js
- Supabase (database, authentication)
- Swagger UI
- Zod
- CORS
- dotenv
- Nodemon (dev)

## Persyaratan

- Node.js 18+ atau versi kompatibel
- Akun Supabase dan project Supabase
- `SUPABASE_URL` dan `SUPABASE_KEY`
- `.env` pada folder `backend`

## Setup Backend

1. Masuk ke folder backend:
   ```powershell
   cd backend
   ```

2. Install dependency:
   ```powershell
   npm install
   ```

3. Buat file `.env` di `backend/` dan isi variabel:
   ```env
   SUPABASE_URL=https://<your-supabase-url>.supabase.co
   SUPABASE_KEY=your-service-role-or-anon-key
   PORT=5000
   BASE_URL=http://localhost:5000/api
   ```

4. Jalankan server:
   ```powershell
   npm run dev
   ```

5. Akses dokumentasi Swagger:
   - `http://localhost:5000/api-docs`

## Endpoint Utama

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/password`
- `GET /api/dashboard`
- `GET /api/dashboard/statistics`
- `GET /api/dashboard/recent-transactions`
- `POST /api/savings`
- `GET /api/savings`
- `GET /api/savings/{id}`
- `PUT /api/savings/{id}`
- `DELETE /api/savings/{id}`
- `GET /api/savings/{id}/transactions`
- `POST /api/transactions`
- `GET /api/transactions`
- `GET /api/transactions/{id}`
- `PATCH /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `POST /api/shared-savings`
- `GET /api/shared-savings`
- `GET /api/shared-savings/{id}`
- `PATCH /api/shared-savings/{id}`
- `DELETE /api/shared-savings/{id}`
- `POST /api/shared-savings/join`
- `GET /api/shared-savings/{id}/members`
- `GET /api/shared-savings/{id}/statistics`
- `POST /api/shared-transactions`
- `PATCH /api/shared-transactions/{id}`
- `DELETE /api/shared-transactions/{id}`

## Dokumentasi API Frontend

Dokumentasi API yang diperuntukkan untuk pengembang frontend tersedia di file `backend/API_DOCUMENTATION.md`.

## Catatan Penting

- Semua endpoint yang membutuhkan autentikasi harus menyertakan header `Authorization: Bearer <access_token>`.
- Server menggunakan Swagger UI untuk melihat dokumentasi interaktif.
- Struktur respons umum terdapat pada docs Swagger (`SuccessResponse` dan `ErrorResponse`).

## Kontak dan Pengembangan

Jika ingin mengembangkan fitur tambahan, lihat folder `backend/src/controllers` dan `backend/src/services` untuk alur bisnis utama.
