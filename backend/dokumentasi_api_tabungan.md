# Dokumentasi API — Tabunganku Backend

> Versi: `1.0.0` | Runtime: `Node.js (ESM)` | Framework: `Express v5` | Database: `Supabase (PostgreSQL)` | Validasi: `Zod v4`

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Arsitektur & Teknologi](#2-arsitektur--teknologi)
3. [Autentikasi](#3-autentikasi)
4. [Format Response](#4-format-response)
5. [Kode Status HTTP](#5-kode-status-http)
6. [Pagination](#6-pagination)
7. [Referensi Endpoint](#7-referensi-endpoint)
   - [7.1 Authentication](#71-authentication)
   - [7.2 Profile](#72-profile)
   - [7.3 Savings (Tabungan Pribadi)](#73-savings-tabungan-pribadi)
   - [7.4 Transactions (Transaksi Pribadi)](#74-transactions-transaksi-pribadi)
   - [7.5 Dashboard](#75-dashboard)
   - [7.6 Shared Savings (Tabungan Bersama)](#76-shared-savings-tabungan-bersama)
   - [7.7 Shared Transactions (Transaksi Bersama)](#77-shared-transactions-transaksi-bersama)
8. [Model Data](#8-model-data)
9. [Aturan Bisnis & Validasi](#9-aturan-bisnis--validasi)
10. [Penanganan Error](#10-penanganan-error)
11. [Konfigurasi & Deployment](#11-konfigurasi--deployment)

---

## 1. Gambaran Umum

**Tabunganku** adalah REST API backend untuk aplikasi manajemen tabungan. API ini mendukung dua mode tabungan:

- **Tabungan Pribadi** — Pengguna membuat dan mengelola target tabungan secara individual.
- **Tabungan Bersama** — Pengguna dapat membuat grup tabungan kolektif, mengundang anggota dengan kode unik, dan melacak kontribusi setiap anggota.

**Base URL (production - Vercel):**
```
https://tabungan-iki-ina.vercel.app/api
```

---

## 2. Arsitektur & Teknologi

### Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js v5 |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Validasi Input | Zod v4 |
| Dokumentasi | Swagger (swagger-jsdoc + swagger-ui-express) |
| Deployment | Vercel |

### Struktur Direktori

```
backend/
└── src/
    ├── app.js                  # Express app setup & route mounting
    ├── index.js                # Entry point (listen server)
    ├── config/
    │   └── supabase.js         # Supabase client initialization
    ├── controllers/            # Request handler (thin layer)
    ├── services/               # Business logic & Supabase queries
    ├── routes/                 # Route definitions + Swagger JSDoc
    ├── middlewares/
    │   ├── auth.js             # requireAuth (Bearer token verification)
    │   ├── validate.js         # Zod validation middleware
    │   ├── asyncHandler.js     # Async error wrapper
    │   └── errorHandler.js     # Global error handler
    ├── validation/             # Zod schemas per domain
    ├── utils/
    │   ├── response.js         # success() / fail() response helpers
    │   └── AppError.js         # Custom error class
    └── docs/
        └── swagger.js          # Swagger spec configuration
```

### Alur Request

```
HTTP Request
    → requireAuth (verifikasi Bearer token via Supabase)
    → validate (Zod schema check)
    → asyncHandler (wrap async, forward error)
    → Controller (memanggil Service)
    → Service (query Supabase, business logic)
    → success() / AppError → errorHandler
    → HTTP Response
```

---

## 3. Autentikasi

### Mekanisme

API menggunakan **JWT Bearer Token** yang diterbitkan oleh **Supabase Auth**. Token ini harus disertakan di setiap endpoint yang memerlukan autentikasi.

### Header yang Diperlukan

```http
Authorization: Bearer <ACCESS_TOKEN>
```

### Cara Mendapatkan Token

1. Lakukan registrasi via `POST /api/auth/register`
2. Lakukan login via `POST /api/auth/login`
3. Gunakan nilai `token` yang ada di dalam `data` response login

### Cara Memperbarui Token

Ketika access token kedaluwarsa, gunakan `refresh_token` yang diterima saat login untuk meminta token baru via `POST /api/auth/refresh` — **tanpa menyertakan Bearer token**.

### Validasi Token (Middleware `requireAuth`)

Middleware ini melakukan langkah-langkah berikut:

1. Membaca header `Authorization`
2. Memastikan format adalah `Bearer <TOKEN>`
3. Memverifikasi token ke Supabase Auth (`supabase.auth.getUser(token)`)
4. Jika valid, menyimpan data user ke `req.user` dan melanjutkan ke controller
5. Jika tidak valid atau kedaluwarsa, mengembalikan `401`

---

## 4. Format Response

Semua response menggunakan format JSON yang konsisten.

### Response Berhasil

```json
{
  "success": true,
  "message": "Pesan sukses dalam Bahasa Indonesia",
  "data": { ... }
}
```

Field `data` dapat berupa `object`, `array`, atau `null` (untuk operasi delete atau logout).

### Response Gagal / Error

```json
{
  "success": false,
  "message": "Deskripsi error",
  "errors": null
}
```

Field `errors` dapat berisi array detail error validasi Zod (atau `null` untuk error umum).

---

## 5. Kode Status HTTP

| Kode | Arti | Kapan Digunakan |
|---|---|---|
| `200` | OK | Berhasil mengambil/memperbarui/menghapus data |
| `201` | Created | Berhasil membuat resource baru |
| `400` | Bad Request | Validasi gagal, input tidak valid, atau saldo tidak cukup |
| `401` | Unauthorized | Token tidak ada, format salah, tidak valid, atau kedaluwarsa |
| `403` | Forbidden | Token valid, tapi user tidak punya hak akses (bukan owner/member) |
| `404` | Not Found | Resource tidak ditemukan |
| `500` | Internal Server Error | Error dari Supabase atau server internal |

---

## 6. Pagination

Endpoint yang mengembalikan daftar data mendukung pagination melalui query parameter.

### Query Parameter Pagination

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `page` | `integer` | `1` | Nomor halaman (minimal 1) |
| `limit` | `integer` | `10` atau `20` | Jumlah item per halaman (max `100`) |
| `sort` | `enum` | `"desc"` | Urutan berdasarkan `created_at`. Nilai: `"asc"` atau `"desc"` |
| `search` | `string` | — | Pencarian teks (case-insensitive, `ilike`) |

### Struktur Response Pagination

```json
{
  "success": true,
  "message": "...",
  "data": {
    "savings": [...],
    "pagination": {
      "total": 47,
      "page": 2,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

> **Catatan:** `totalPages` selalu minimal bernilai `1` meskipun data kosong, agar tidak menyebabkan masalah di sisi frontend.

---

## 7. Referensi Endpoint

---

### 7.1 Authentication

Base path: `/api/auth`

---

#### `POST /api/auth/register`

Mendaftarkan pengguna baru. Supabase akan mengirimkan email verifikasi ke alamat yang didaftarkan.

**Autentikasi:** Tidak diperlukan

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
<<<<<<< HEAD
=======
| `name` | `string` | Ya | Minimal 2 karakter |
| `username` | `string` | Tidak | Minimal 3 karakter, maksimal 30 karakter |
| `avatar` | `string` | Tidak | URL gambar valid (opsional) |
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
| `email` | `string` | Ya | Format email valid |
| `password` | `string` | Ya | Minimal 8 karakter |

**Contoh Request:**
```json
{
<<<<<<< HEAD
=======
  "name": "John Doe",
  "username": "johndoe",
  "avatar": "https://example.com/avatar.jpg",
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Registrasi berhasil! Silakan cek email Anda untuk verifikasi.",
  "data": {
    "user": {
      "id": "uuid-user",
      "email": "user@example.com",
<<<<<<< HEAD
      "created_at": "2025-01-01T00:00:00Z",
      "..."
=======
      "name": "John Doe",
      "username": "johndoe",
      "avatar": null
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
    },
    "session": null
  }
}
```

<<<<<<< HEAD
> Nilai `session` akan `null` karena akun belum diverifikasi via email. Setelah verifikasi, pengguna dapat login.
=======
> Response register berbeda dari login karena register hanya membuat akun dan mengembalikan profil pengguna beserta `session` (yang bisa `null` tergantung konfigurasi Supabase). Login akan mengembalikan token akses dan refresh token.
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525

**Response Error `400`:**
```json
{
  "success": false,
  "message": "User already registered"
}
```

---

#### `POST /api/auth/login`

Mengautentikasi pengguna dan mengembalikan access token serta refresh token.

**Autentikasi:** Tidak diperlukan

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `email` | `string` | Ya | Format email valid |
| `password` | `string` | Ya | Tidak boleh kosong |

**Contoh Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Login sukses!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-user",
      "email": "user@example.com",
<<<<<<< HEAD
      "user_metadata": {
        "name": "John Doe",
        "username": "johndoe",
        "picture": "https://..."
      },
      "app_metadata": {
        "role": "user"
      }
=======
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "https://.../avatar.jpg"
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
    }
  }
}
```

<<<<<<< HEAD
=======
> Setelah login berhasil, client sebaiknya menyimpan `token` dan `refresh_token` untuk dipakai di endpoint lain yang memerlukan autentikasi.

>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
**Response Error `401`:**
```json
{
  "success": false,
  "message": "Invalid login credentials"
}
```

---

#### `POST /api/auth/refresh`

Memperbarui access token yang kedaluwarsa menggunakan refresh token.

**Autentikasi:** Tidak diperlukan

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `refresh_token` | `string` | Ya | Tidak boleh kosong |

**Contoh Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Token berhasil diperbarui",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> Setiap kali refresh dilakukan, **kedua token** (access dan refresh) diperbarui. Simpan kedua nilai baru tersebut dan buang yang lama.

**Response Error `400`:**
```json
{
  "success": false,
  "message": "Invalid Refresh Token"
}
```

---

#### `POST /api/auth/logout`

Mengakhiri sesi pengguna yang sedang aktif.

**Autentikasi:** Diperlukan (`Bearer Token`)

**Request Body:** Tidak ada

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Logout berhasil. Hapus token dari client.",
  "data": null
}
```

> Setelah logout, hapus `token` dan `refresh_token` dari penyimpanan di sisi client (localStorage, cookie, dsb.).

---

### 7.2 Profile

Base path: `/api/profile`

Semua endpoint di bagian ini **memerlukan autentikasi**.

---

#### `GET /api/profile`

Mengambil profil pengguna yang sedang login.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Profil user berhasil diambil.",
  "data": {
    "user": {
      "id": "uuid-user",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "https://example.com/avatar.jpg",
      "role": "user"
    }
  }
}
```

> Data diambil dari `req.user` yang sudah diset oleh middleware `requireAuth` — tidak ada query database tambahan untuk endpoint ini.

---

#### `PUT /api/profile`

Memperbarui informasi profil pengguna. Setidaknya satu field harus dikirimkan.

**Request Body (minimal satu field):**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | `string` | Tidak | Minimal 1 karakter (setelah trim) |
| `username` | `string` | Tidak | Minimal 1 karakter (setelah trim) |
| `avatar` | `string` | Tidak | URL valid |

**Contoh Request:**
```json
{
  "name": "John Doe Updated",
  "username": "johndoe_new"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Profil berhasil diperbarui.",
  "data": {
    "user": {
      "id": "uuid-user",
      "email": "user@example.com",
      "name": "John Doe Updated",
      "username": "johndoe_new",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
}
```

**Response Error `400`:**
```json
{
  "success": false,
<<<<<<< HEAD
  "message": "Minimal salah satu field harus diisi."
=======
  "message": "Minimal salah satu field harus diisi.",
  "errors": null
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
}
```

---

<<<<<<< HEAD
=======
#### `POST /api/profile/avatar`

Mengunggah foto profil pengguna melalui multipart form-data. File yang dikirim harus berupa gambar.

**Request Body:**
- Field `avatar` berupa file gambar (`multipart/form-data`)

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Foto profil berhasil diunggah.",
  "data": {
    "user": {
      "id": "uuid-user",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "https://.../avatars/uuid-user/....jpg",
      "role": "user"
    }
  }
}
```

> Saat avatar baru diunggah, file avatar lama di bucket storage akan otomatis dihapus.

---

>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
#### `PUT /api/profile/password`

Mengubah password pengguna. Password lama diverifikasi terlebih dahulu sebelum diganti.

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `old_password` | `string` | Ya | Tidak boleh kosong |
| `new_password` | `string` | Ya | Minimal 8 karakter |

**Contoh Request:**
```json
{
  "old_password": "password123",
  "new_password": "newpassword456"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Password berhasil diubah. Silakan login kembali dengan password baru.",
  "data": null
}
```

**Response Error `401`:**
```json
{
  "success": false,
  "message": "Password lama salah."
}
```

---

### 7.3 Savings (Tabungan Pribadi)

Base path: `/api/savings`

Semua endpoint di bagian ini **memerlukan autentikasi**. Setiap pengguna hanya dapat melihat dan mengelola tabungan miliknya sendiri (data difilter berdasarkan `user_id`).

---

#### `POST /api/savings`

Membuat target tabungan pribadi baru. Saldo awal (`current_amount`) otomatis diset ke `0`.

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | `string` | Ya | Minimal 1 karakter (setelah trim) |
| `target_amount` | `number` | Ya | Harus positif (lebih dari 0) |
<<<<<<< HEAD
=======
| `image_url` | `string` | Tidak | URL gambar valid (opsional) |
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525

**Contoh Request:**
```json
{
  "name": "Dana Liburan Bali",
  "target_amount": 5000000
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Target tabungan berhasil dibuat!",
  "data": {
    "savings": {
      "id": "uuid-savings",
      "user_id": "uuid-user",
      "name": "Dana Liburan Bali",
      "target_amount": 5000000,
      "current_amount": 0,
<<<<<<< HEAD
=======
      "image_url": null,
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
      "created_at": "2025-06-27T10:00:00Z",
      "updated_at": "2025-06-27T10:00:00Z"
    }
  }
}
```

---

#### `GET /api/savings`

Mengambil daftar target tabungan milik pengguna dengan dukungan pencarian dan pagination.

**Query Parameter:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `page` | `integer` | `1` | Halaman (min: 1) |
| `limit` | `integer` | `10` | Item per halaman (max: 100) |
| `sort` | `enum` | `"desc"` | `"asc"` atau `"desc"` berdasarkan `created_at` |
| `search` | `string` | — | Pencarian berdasarkan nama tabungan |
| `keyword` | `string` | — | Alias dari `search` (keduanya bisa digunakan) |

**Contoh Request:**
```
GET /api/savings?page=1&limit=5&sort=asc&search=liburan
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Data tabungan berhasil diambil.",
  "data": {
    "savings": [
      {
        "id": "uuid-savings",
        "user_id": "uuid-user",
        "name": "Dana Liburan Bali",
        "target_amount": 5000000,
        "current_amount": 1500000,
        "created_at": "2025-06-27T10:00:00Z",
        "updated_at": "2025-06-27T11:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 5,
      "totalPages": 1
    }
  }
}
```

---

#### `GET /api/savings/:id`

Mengambil detail satu target tabungan berdasarkan UUID-nya.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik tabungan |

**Contoh Request:**
```
GET /api/savings/550e8400-e29b-41d4-a716-446655440000
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Detail tabungan berhasil diambil.",
  "data": {
    "savings": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "uuid-user",
      "name": "Dana Liburan Bali",
      "target_amount": 5000000,
      "current_amount": 1500000,
      "created_at": "2025-06-27T10:00:00Z",
      "updated_at": "2025-06-27T11:00:00Z"
    }
  }
}
```

**Response Error `404`:**
```json
{
  "success": false,
  "message": "Target tabungan tidak ditemukan."
}
```

---

#### `PUT /api/savings/:id`

Memperbarui nama atau target amount tabungan. Setidaknya satu field harus dikirimkan.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik tabungan |

**Request Body (minimal satu field):**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | `string` | Tidak | Minimal 1 karakter |
| `target_amount` | `number` | Tidak | Harus positif |

**Contoh Request:**
```json
{
  "name": "Dana Liburan Bali 2026",
  "target_amount": 8000000
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Target tabungan berhasil diperbarui.",
  "data": {
    "savings": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "uuid-user",
      "name": "Dana Liburan Bali 2026",
      "target_amount": 8000000,
      "current_amount": 1500000,
      "created_at": "2025-06-27T10:00:00Z",
      "updated_at": "2025-06-27T12:00:00Z"
    }
  }
}
```

---

<<<<<<< HEAD
=======
#### `POST /api/savings/:id/image`

Mengunggah gambar untuk target tabungan pribadi. File yang dikirim harus berupa gambar.

**Request Body:**
- Field `image` berupa file gambar (`multipart/form-data`)

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Gambar tabungan berhasil diunggah.",
  "data": {
    "savings": {
      "id": "uuid-savings",
      "user_id": "uuid-user",
      "name": "Dana Liburan Bali",
      "target_amount": 5000000,
      "current_amount": 0,
      "image_url": "https://.../savings-images/...jpg",
      "created_at": "2025-06-27T10:00:00Z",
      "updated_at": "2025-06-27T10:00:00Z"
    }
  }
}
```

> Saat gambar baru diunggah, file lama di bucket storage akan otomatis dihapus.

---

>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
#### `DELETE /api/savings/:id`

Menghapus target tabungan berdasarkan UUID.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik tabungan |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Target tabungan berhasil dihapus.",
  "data": null
}
```

---

#### `GET /api/savings/:id/transactions`

Mengambil riwayat transaksi yang dikaitkan dengan tabungan tertentu.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik tabungan |

**Query Parameter:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `page` | `integer` | `1` | Halaman |
| `limit` | `integer` | `20` | Item per halaman (max: 100) |
| `sort` | `enum` | `"desc"` | `"asc"` atau `"desc"` |
| `type` | `enum` | — | Filter tipe: `"deposit"` atau `"withdrawal"` |
| `search` | `string` | — | Pencarian berdasarkan `description` |

**Contoh Request:**
```
GET /api/savings/550e8400-e29b-41d4-a716-446655440000/transactions?type=deposit&limit=10
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Riwayat transaksi berhasil diambil.",
  "data": {
    "transactions": [
      {
        "id": "uuid-transaction",
        "user_id": "uuid-user",
        "savings_id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "deposit",
        "amount": 500000,
        "description": "Gaji bulan Juni",
        "created_at": "2025-06-01T09:00:00Z"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 7.4 Transactions (Transaksi Pribadi)

Base path: `/api/transactions`

Semua endpoint di bagian ini **memerlukan autentikasi**.

> **Penting:** Setiap operasi transaksi (create, update, delete) secara otomatis memperbarui `current_amount` pada tabungan terkait. Saldo tidak bisa menjadi negatif.

---

#### `POST /api/transactions`

Membuat transaksi baru (setoran atau penarikan) yang dikaitkan dengan sebuah tabungan.

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `savings_id` | `string (UUID)` | Ya | Harus milik pengguna yang login |
| `type` | `enum` | Ya | `"deposit"` atau `"withdrawal"` |
| `amount` | `number` | Ya | Harus positif (lebih dari 0) |
| `description` | `string` | Tidak | Maksimal 255 karakter |

**Contoh Request:**
```json
{
  "savings_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "deposit",
  "amount": 500000,
  "description": "Gaji bulan Juni"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Transaksi berhasil dicatat.",
  "data": {
    "saldo_sekarang": 2000000,
    "detail_transaksi": {
      "id": "uuid-transaction",
      "user_id": "uuid-user",
      "savings_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "deposit",
      "amount": 500000,
      "description": "Gaji bulan Juni",
      "created_at": "2025-06-27T10:00:00Z"
    }
  }
}
```

**Response Error `400` (saldo tidak cukup):**
```json
{
  "success": false,
  "message": "Saldo tabungan tidak mencukupi."
}
```

---

#### `GET /api/transactions`

Mengambil semua transaksi milik pengguna dengan filter dan pagination.

**Query Parameter:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `page` | `integer` | `1` | Halaman |
| `limit` | `integer` | `20` | Item per halaman (max: 100) |
| `sort` | `enum` | `"desc"` | `"asc"` atau `"desc"` berdasarkan `created_at` |
| `type` | `enum` | — | Filter: `"deposit"` atau `"withdrawal"` |
| `savings_id` | `string (UUID)` | — | Filter berdasarkan ID tabungan |
| `search` | `string` | — | Pencarian berdasarkan `description` |

**Contoh Request:**
```
GET /api/transactions?type=withdrawal&page=1&limit=10
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Riwayat transaksi berhasil diambil.",
  "data": {
    "transactions": [
      {
        "id": "uuid-transaction",
        "user_id": "uuid-user",
        "savings_id": "uuid-savings",
        "type": "withdrawal",
        "amount": 200000,
        "description": "Biaya transportasi",
        "created_at": "2025-06-20T14:00:00Z"
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

#### `GET /api/transactions/:id`

Mengambil detail satu transaksi berdasarkan UUID-nya.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik transaksi |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Detail transaksi berhasil diambil.",
  "data": {
    "transaction": {
      "id": "uuid-transaction",
      "user_id": "uuid-user",
      "savings_id": "uuid-savings",
      "type": "deposit",
      "amount": 500000,
      "description": "Gaji bulan Juni",
      "created_at": "2025-06-01T09:00:00Z"
    }
  }
}
```

---

#### `PATCH /api/transactions/:id`

Memperbarui data transaksi. Saldo tabungan direcalculate secara otomatis: efek transaksi lama di-*rollback* terlebih dahulu, lalu nilai baru diterapkan.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik transaksi |

**Request Body (minimal satu field):**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `type` | `enum` | Tidak | `"deposit"` atau `"withdrawal"` |
| `amount` | `number` | Tidak | Harus positif |
| `description` | `string` | Tidak | Maksimal 255 karakter |

**Contoh Request:**
```json
{
  "amount": 750000,
  "description": "Gaji Juni (dikoreksi)"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaksi berhasil diperbarui.",
  "data": {
    "saldo_sekarang": 2250000,
    "detail_transaksi": {
      "id": "uuid-transaction",
      "user_id": "uuid-user",
      "savings_id": "uuid-savings",
      "type": "deposit",
      "amount": 750000,
      "description": "Gaji Juni (dikoreksi)",
      "created_at": "2025-06-01T09:00:00Z"
    }
  }
}
```

**Logika Recalculation:**
```
Saldo baru = (Saldo saat ini) - (Efek transaksi lama) + (Efek transaksi baru)
```

Jika saldo hasil recalculation menjadi negatif, server mengembalikan error `400 "Saldo tabungan tidak mencukupi."`.

---

#### `DELETE /api/transactions/:id`

Menghapus transaksi dan me-*rollback* dampaknya pada saldo tabungan secara otomatis.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik transaksi |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus.",
  "data": {
    "saldo_sekarang": 1500000
  }
}
```

---

### 7.5 Dashboard

Base path: `/api/dashboard`

Semua endpoint di bagian ini **memerlukan autentikasi**. Data yang dikembalikan adalah agregat dari seluruh tabungan dan transaksi milik pengguna.

---

#### `GET /api/dashboard`

Mengambil ringkasan keseluruhan kondisi keuangan pengguna.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Dashboard berhasil diambil.",
  "data": {
    "dashboard": {
      "total_savings": 3500000,
      "total_target": 15000000,
      "progress": 23,
      "completion_rate": 23,
      "remaining_target": 11500000,
      "total_transactions": 24,
      "total_deposit": 5000000,
      "total_withdrawal": 1500000,
      "num_savings_goals": 3
    }
  }
}
```

**Penjelasan Field:**

| Field | Deskripsi |
|---|---|
| `total_savings` | Total saldo saat ini dari semua tabungan |
| `total_target` | Total target dari semua tabungan |
| `progress` / `completion_rate` | Persentase pencapaian (%) dibulatkan |
| `remaining_target` | Sisa yang harus ditabung (tidak bisa negatif) |
| `total_transactions` | Jumlah total semua transaksi |
| `total_deposit` | Total semua setoran |
| `total_withdrawal` | Total semua penarikan |
| `num_savings_goals` | Jumlah target tabungan yang dimiliki |

---

#### `GET /api/dashboard/statistics`

Mengambil statistik setoran dan penarikan per bulan untuk seluruh riwayat transaksi pengguna.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Statistik berhasil diambil.",
  "data": {
    "per_month": [
      {
        "month": "2025-03",
        "deposit": 2000000,
        "withdrawal": 500000
      },
      {
        "month": "2025-04",
        "deposit": 1500000,
        "withdrawal": 200000
      },
      {
        "month": "2025-06",
        "deposit": 1500000,
        "withdrawal": 800000
      }
    ]
  }
}
```

> Data diurutkan berdasarkan `created_at` secara ascending. Format `month` adalah `YYYY-MM`.

---

#### `GET /api/dashboard/recent-transactions`

Mengambil transaksi terbaru untuk ditampilkan di ringkasan dashboard.

**Query Parameter:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `limit` | `integer` | `5` | Jumlah transaksi yang dikembalikan (minimal 1) |

**Contoh Request:**
```
GET /api/dashboard/recent-transactions?limit=10
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Riwayat transaksi terbaru berhasil diambil.",
  "data": {
    "recent_transactions": [
      {
        "id": "uuid-transaction",
        "type": "deposit",
        "amount": 500000,
        "description": "Gaji bulan Juni",
        "created_at": "2025-06-27T10:00:00Z"
      },
      {
        "id": "uuid-transaction-2",
        "type": "withdrawal",
        "amount": 100000,
        "description": "Jajan",
        "created_at": "2025-06-25T15:30:00Z"
      }
    ]
  }
}
```

---

### 7.6 Shared Savings (Tabungan Bersama)

Base path: `/api/shared-savings`

Semua endpoint di bagian ini **memerlukan autentikasi**.

**Sistem peran (role):**

| Role | Hak Akses |
|---|---|
| `owner` | Dapat melihat, mengubah, menghapus grup, dan melakukan transaksi |
| `member` | Dapat melihat grup dan melakukan transaksi |

---

#### `POST /api/shared-savings`

Membuat grup tabungan bersama baru. Pembuat otomatis menjadi `owner` dan `invite_code` unik (8 karakter hex uppercase) dibuat secara otomatis.

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | `string` | Ya | Minimal 1 karakter |
| `description` | `string` | Tidak | Maksimal 255 karakter |
| `target_amount` | `number` | Ya | Harus positif |
<<<<<<< HEAD
=======
| `image_url` | `string` | Tidak | URL gambar valid (opsional) |
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525

**Contoh Request:**
```json
{
  "name": "Liburan Keluarga 2026",
  "description": "Tabungan bersama untuk liburan akhir tahun",
  "target_amount": 20000000
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Tabungan bersama berhasil dibuat.",
  "data": {
    "shared_savings": {
      "id": "uuid-shared-savings",
      "owner_id": "uuid-user",
      "name": "Liburan Keluarga 2026",
      "description": "Tabungan bersama untuk liburan akhir tahun",
      "target_amount": 20000000,
      "current_amount": 0,
<<<<<<< HEAD
=======
      "image_url": null,
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
      "invite_code": "A3F9B2C1",
      "status": "active",
      "created_at": "2025-06-27T10:00:00Z"
    },
    "member": {
      "id": "uuid-member",
      "shared_savings_id": "uuid-shared-savings",
      "user_id": "uuid-user",
      "role": "owner",
      "joined_at": "2025-06-27T10:00:00Z"
    }
  }
}
```

> **Catatan Atomik:** Jika proses pembuatan berhasil namun penambahan owner ke tabel member gagal, data shared savings akan dihapus secara otomatis untuk menjaga konsistensi data.

---

#### `GET /api/shared-savings`

Mengambil daftar semua grup tabungan bersama yang diikuti oleh pengguna (sebagai owner maupun member).

**Query Parameter:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `page` | `integer` | `1` | Halaman |
| `limit` | `integer` | `20` | Item per halaman (max: 100) |
| `sort` | `enum` | `"desc"` | `"asc"` atau `"desc"` berdasarkan `created_at` |
| `search` | `string` | — | Cari berdasarkan `name` atau `description` |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Data tabungan bersama berhasil diambil.",
  "data": {
    "shared_savings": [
      {
        "id": "uuid-shared-savings",
        "owner_id": "uuid-user",
        "name": "Liburan Keluarga 2026",
        "description": "...",
        "target_amount": 20000000,
        "current_amount": 5000000,
        "invite_code": "A3F9B2C1",
        "status": "active",
        "created_at": "2025-06-27T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

#### `GET /api/shared-savings/:id`

Mengambil detail grup tabungan bersama. Hanya dapat diakses oleh anggota grup.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared savings |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Detail tabungan bersama berhasil diambil.",
  "data": {
    "shared_savings": {
      "id": "uuid-shared-savings",
      "owner_id": "uuid-user",
      "name": "Liburan Keluarga 2026",
      "description": "Tabungan bersama untuk liburan akhir tahun",
      "target_amount": 20000000,
      "current_amount": 5000000,
      "invite_code": "A3F9B2C1",
      "status": "active",
      "created_at": "2025-06-27T10:00:00Z"
    }
  }
}
```

**Response Error `403`:**
```json
{
  "success": false,
  "message": "Anda bukan anggota tabungan bersama ini."
}
```

---

#### `PATCH /api/shared-savings/:id`

Memperbarui detail grup tabungan bersama. **Hanya owner yang diizinkan.**

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared savings |

**Request Body (minimal satu field):**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | `string` | Tidak | Minimal 1 karakter |
| `description` | `string` | Tidak | Maksimal 255 karakter |
| `target_amount` | `number` | Tidak | Harus positif |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tabungan bersama berhasil diperbarui.",
  "data": {
    "shared_savings": { ... }
  }
}
```

**Response Error `403`:**
```json
{
  "success": false,
  "message": "Hanya owner yang dapat mengubah tabungan bersama."
}
```

---

#### `DELETE /api/shared-savings/:id`

Menghapus grup tabungan bersama beserta seluruh data terkait (member dan transaksi). **Hanya owner yang diizinkan.**

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared savings |

Urutan penghapusan:
1. Hapus semua `shared_transactions` yang terkait
2. Hapus semua `shared_members` yang terkait
3. Hapus `shared_savings` itu sendiri

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tabungan bersama berhasil dihapus.",
  "data": null
}
```

<<<<<<< HEAD
=======
> Saat grup dihapus, status grup diubah menjadi `deleted` dan `invite_code` di-null-kan, sehingga kode undangan tidak lagi bisa digunakan untuk bergabung.

>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
---

#### `POST /api/shared-savings/join`

Bergabung ke grup tabungan bersama menggunakan kode undangan. Pengguna yang sudah menjadi anggota tidak dapat bergabung lagi.

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `invite_code` | `string` | Ya | Kode undangan 8 karakter (case-sensitive) |

**Contoh Request:**
```json
{
  "invite_code": "A3F9B2C1"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Berhasil bergabung ke tabungan bersama.",
  "data": {
    "shared_savings": {
      "id": "uuid-shared-savings",
      "name": "Liburan Keluarga 2026",
      "..."
    },
    "member": {
      "id": "uuid-member",
      "shared_savings_id": "uuid-shared-savings",
      "user_id": "uuid-user",
      "role": "member",
      "joined_at": "2025-06-27T11:00:00Z"
    }
  }
}
```

**Response Error `404`:**
```json
{
  "success": false,
  "message": "Kode undangan tidak valid."
}
```

**Response Error `400`:**
```json
{
  "success": false,
  "message": "Anda sudah bergabung ke tabungan bersama ini."
}
```

---

<<<<<<< HEAD
=======
#### `POST /api/shared-savings/:id/image`

Mengunggah gambar untuk grup tabungan bersama. File yang dikirim harus berupa gambar.

**Request Body:**
- Field `image` berupa file gambar (`multipart/form-data`)

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Gambar tabungan bersama berhasil diunggah.",
  "data": {
    "shared_savings": {
      "id": "uuid-shared-savings",
      "owner_id": "uuid-user",
      "name": "Liburan Keluarga 2026",
      "description": "Tabungan bersama untuk liburan akhir tahun",
      "target_amount": 20000000,
      "current_amount": 0,
      "image_url": "https://.../shared-savings-images/...jpg",
      "invite_code": "A3F9B2C1",
      "status": "active",
      "created_at": "2025-06-27T10:00:00Z"
    }
  }
}
```

> Saat gambar baru diunggah, file lama di bucket storage akan otomatis dihapus.

---

>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
#### `GET /api/shared-savings/:id/members`

Mengambil daftar anggota dalam sebuah grup tabungan bersama. Hanya dapat diakses oleh anggota grup.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared savings |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Daftar member tabungan bersama berhasil diambil.",
  "data": {
    "members": [
      {
        "id": "uuid-member-1",
        "user_id": "uuid-user-1",
        "name": "John Doe",
        "role": "owner",
        "joined_at": "2025-06-27T10:00:00Z"
      },
      {
        "id": "uuid-member-2",
        "user_id": "uuid-user-2",
        "name": "Jane Smith",
        "role": "member",
        "joined_at": "2025-06-27T11:30:00Z"
      }
    ]
  }
}
```

> Nama anggota (`name`) diambil dari tabel `profiles`. Jika profil tidak ditemukan, nilai `name` akan diisi dengan `user_id`.

---

#### `GET /api/shared-savings/:id/statistics`

Mengambil statistik kontribusi per anggota dalam sebuah grup tabungan bersama.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared savings |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Statistik tabungan bersama berhasil diambil.",
  "data": {
    "target": 20000000,
    "current": 7500000,
    "progress": 38,
    "remaining": 12500000,
    "members": [
      {
        "user_id": "uuid-user-1",
        "name": "John Doe",
        "role": "owner",
        "total_deposit": 5000000,
        "total_withdrawal": 500000
      },
      {
        "user_id": "uuid-user-2",
        "name": "Jane Smith",
        "role": "member",
        "total_deposit": 3000000,
        "total_withdrawal": 0
      }
    ]
  }
}
```

**Penjelasan Field:**

| Field | Deskripsi |
|---|---|
| `target` | Total target tabungan bersama |
| `current` | Saldo saat ini |
| `progress` | Persentase pencapaian (%) dibulatkan |
| `remaining` | Sisa yang harus ditabung (tidak bisa negatif) |
| `members[].total_deposit` | Total setoran oleh anggota ini |
| `members[].total_withdrawal` | Total penarikan oleh anggota ini |

---

### 7.7 Shared Transactions (Transaksi Bersama)

Base path: `/api/shared-transactions`

Semua endpoint di bagian ini **memerlukan autentikasi**. Semua anggota grup (owner maupun member) dapat membuat, mengubah, dan menghapus transaksi.

> **Penting:** Setiap operasi transaksi secara otomatis memperbarui `current_amount` pada `shared_savings` terkait. Saldo tidak bisa menjadi negatif.

---

#### `POST /api/shared-transactions`

Membuat transaksi baru untuk sebuah grup tabungan bersama.

**Request Body:**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `shared_savings_id` | `string (UUID)` | Ya | Harus merupakan grup yang diikuti pengguna |
| `type` | `enum` | Ya | `"deposit"` atau `"withdrawal"` |
| `amount` | `number` | Ya | Harus positif |
| `description` | `string` | Tidak | Maksimal 255 karakter |

**Contoh Request:**
```json
{
  "shared_savings_id": "uuid-shared-savings",
  "type": "deposit",
  "amount": 1000000,
  "description": "Kontribusi bulan Juni - John"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Transaksi tabungan bersama berhasil dicatat.",
  "data": {
    "shared_transaction": {
      "id": "uuid-shared-transaction",
      "shared_savings_id": "uuid-shared-savings",
      "user_id": "uuid-user",
      "type": "deposit",
      "amount": 1000000,
      "description": "Kontribusi bulan Juni - John",
      "created_at": "2025-06-27T10:00:00Z"
    },
    "saldo_sekarang": 8500000
  }
}
```

**Response Error `403`:**
```json
{
  "success": false,
  "message": "Anda bukan anggota tabungan bersama ini."
}
```

**Response Error `400` (saldo tidak cukup):**
```json
{
  "success": false,
  "message": "Saldo tabungan bersama tidak mencukupi."
}
```

---

#### `PATCH /api/shared-transactions/:id`

Memperbarui data transaksi bersama. Saldo grup direcalculate secara otomatis.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared transaction |

**Request Body (minimal satu field):**

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `type` | `enum` | Tidak | `"deposit"` atau `"withdrawal"` |
| `amount` | `number` | Tidak | Harus positif |
| `description` | `string` | Tidak | Maksimal 255 karakter |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaksi tabungan bersama berhasil diperbarui.",
  "data": {
    "shared_transaction": {
      "id": "uuid-shared-transaction",
      "shared_savings_id": "uuid-shared-savings",
      "user_id": "uuid-user",
      "type": "deposit",
      "amount": 1500000,
      "description": "Kontribusi bulan Juni - John (dikoreksi)",
      "created_at": "2025-06-27T10:00:00Z"
    },
    "saldo_sekarang": 9000000
  }
}
```

---

#### `DELETE /api/shared-transactions/:id`

Menghapus transaksi bersama dan me-*rollback* dampaknya pada saldo grup.

**Path Parameter:**

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string (UUID)` | ID unik shared transaction |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaksi tabungan bersama berhasil dihapus.",
  "data": {
    "saldo_sekarang": 7500000
  }
}
```

---

## 8. Model Data

### Tabel: `savings_goals`

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik |
| `user_id` | `UUID` (FK) | Referensi ke auth user |
| `name` | `string` | Nama target tabungan |
| `target_amount` | `numeric` | Jumlah target |
| `current_amount` | `numeric` | Saldo saat ini (default: `0`) |
<<<<<<< HEAD
=======
| `image_url` | `string` | URL gambar tabungan (opsional) |
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu terakhir diperbarui |

### Tabel: `transactions`

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik |
| `user_id` | `UUID` (FK) | Referensi ke auth user |
| `savings_id` | `UUID` (FK) | Referensi ke `savings_goals` |
| `type` | `enum` | `"deposit"` atau `"withdrawal"` |
| `amount` | `numeric` | Jumlah transaksi |
| `description` | `string` | Keterangan (default: `""`) |
| `created_at` | `timestamptz` | Waktu transaksi |

### Tabel: `shared_savings`

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik |
| `owner_id` | `UUID` (FK) | Referensi ke auth user (creator) |
| `name` | `string` | Nama grup tabungan |
| `description` | `string` | Deskripsi (default: `""`) |
| `target_amount` | `numeric` | Jumlah target bersama |
| `current_amount` | `numeric` | Saldo saat ini (default: `0`) |
<<<<<<< HEAD
=======
| `image_url` | `string` | URL gambar grup (opsional) |
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525
| `invite_code` | `string` | Kode undangan 8 karakter hex uppercase unik |
| `status` | `string` | Status grup (default: `"active"`) |
| `created_at` | `timestamptz` | Waktu pembuatan |

### Tabel: `shared_members`

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik |
| `shared_savings_id` | `UUID` (FK) | Referensi ke `shared_savings` |
| `user_id` | `UUID` (FK) | Referensi ke auth user |
| `role` | `enum` | `"owner"` atau `"member"` |
| `joined_at` | `timestamptz` | Waktu bergabung |

### Tabel: `shared_transactions`

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id` | `UUID` (PK) | Identifier unik |
| `shared_savings_id` | `UUID` (FK) | Referensi ke `shared_savings` |
| `user_id` | `UUID` (FK) | Referensi ke auth user (pembuat transaksi) |
| `type` | `enum` | `"deposit"` atau `"withdrawal"` |
| `amount` | `numeric` | Jumlah transaksi |
| `description` | `string` | Keterangan (default: `""`) |
| `created_at` | `timestamptz` | Waktu transaksi |

### Tabel: `profiles` (Baca-saja oleh API)

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id` | `UUID` (FK) | Referensi ke auth user |
<<<<<<< HEAD
| `name` | `string` | Nama tampilan pengguna |
=======
| `full_name` | `string` | Nama tampilan pengguna |
| `username` | `string` | Username pengguna |
| `avatar_url` | `string` | URL avatar pengguna |
>>>>>>> 22b4a4f0666d8c8aaeb593e490b3ce5d5002b525

---

## 9. Aturan Bisnis & Validasi

### Validasi Input (Zod)

Semua input divalidasi menggunakan skema Zod sebelum mencapai controller. Jika validasi gagal, server langsung mengembalikan `400` dengan pesan error yang deskriptif.

| Domain | Field | Aturan |
|---|---|---|
| Register | `email` | Format email valid |
| Register | `password` | Minimal 8 karakter |
| Login | `password` | Tidak boleh kosong |
| Refresh | `refresh_token` | Tidak boleh kosong |
| Update Profile | — | Minimal satu field |
| Change Password | `new_password` | Minimal 8 karakter |
| Create Savings | `name` | Minimal 1 karakter (after trim) |
| Create Savings | `target_amount` | Harus positif |
| Update Savings | — | Minimal satu field |
| Savings ID | `id` | Format UUID valid |
| Create Transaction | `savings_id` | Format UUID valid |
| Create Transaction | `type` | Hanya `"deposit"` / `"withdrawal"` |
| Create Transaction | `amount` | Harus positif |
| Create Transaction | `description` | Maksimal 255 karakter |
| Update Transaction | — | Minimal satu field |
| Create Shared Savings | `target_amount` | Harus positif (coerce number) |
| Create Shared Savings | `description` | Opsional, maks 255 karakter |
| Join Shared Savings | `invite_code` | Tidak boleh kosong |
| Create Shared Transaction | `shared_savings_id` | Format UUID valid |

### Aturan Saldo

- Saldo tidak pernah bisa menjadi **negatif**.
- Pada `withdrawal` (transaksi pribadi maupun bersama): jika `amount > current_amount`, server mengembalikan `400 "Saldo tabungan tidak mencukupi."`.
- Pada `DELETE` transaksi: saldo di-*rollback* dengan membalik efek transaksi yang dihapus.
- Pada `PATCH` transaksi: saldo di-*rollback* dari nilai lama, lalu nilai baru diterapkan.

### Aturan Akses Shared Savings

- Semua operasi pada `shared_savings` dan `shared_transactions` memeriksa keanggotaan pengguna terlebih dahulu.
- `PATCH` dan `DELETE` pada **shared_savings** hanya dapat dilakukan oleh `owner`.
- Semua anggota (owner dan member) dapat membuat, mengubah, dan menghapus **shared_transactions**.

### Invite Code

- Dibuat secara acak menggunakan `crypto.randomBytes(4).toString("hex").toUpperCase()` → 8 karakter hex uppercase (contoh: `"A3F9B2C1"`).
- Dijamin unik dengan mekanisme retry hingga 5 kali percobaan.

---

## 10. Penanganan Error

### Global Error Handler

Semua error yang tidak tertangkap oleh controller akan ditangkap oleh middleware `errorHandler` dan dikembalikan dalam format standar:

```json
{
  "success": false,
  "message": "Pesan error",
  "errors": null
}
```

### AppError

Error yang disengaja (misal: validasi bisnis, resource tidak ditemukan) dibuat menggunakan class `AppError`:

```javascript
throw new AppError("Target tabungan tidak ditemukan.", 404);
```

Server akan menggunakan `statusCode` dari `AppError` sebagai HTTP status code response.

### Error Autentikasi (Langsung dari Middleware)

Error autentikasi dikembalikan langsung oleh middleware `requireAuth` (bukan melalui `errorHandler`):

```json
{
  "error": "Akses ditolak. Token tidak ditemukan atau format salah."
}
```

atau

```json
{
  "error": "Token tidak valid atau sudah kedaluwarsa."
}
```

> Perhatikan bahwa format ini sedikit berbeda (menggunakan key `error` bukan `success`/`message`) karena langsung menggunakan `res.status().json()`.

---

## 11. Konfigurasi & Deployment

### Environment Variables

Buat file `.env` di direktori `backend/` dengan isi berikut:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-or-service-role-key>
PORT=5000
```

| Variabel | Deskripsi | Wajib |
|---|---|---|
| `SUPABASE_URL` | URL project Supabase | Ya |
| `SUPABASE_KEY` | API key Supabase (anon atau service role) | Ya |
| `PORT` | Port server (default: `5000`) | Tidak |

### Menjalankan Secara Lokal

```bash
# Masuk ke direktori backend
cd backend

# Install dependensi
npm install

# Jalankan dalam mode development (dengan hot-reload)
npm run dev

# Atau jalankan secara langsung
npm start
```

### Deployment ke Vercel

File `vercel.json` sudah dikonfigurasi untuk meneruskan semua request ke handler Express:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api-docs/(.*)",
      "destination": "/api-docs/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

### Dependensi Utama

| Paket | Versi | Fungsi |
|---|---|---|
| `express` | `^5.2.1` | Framework web |
| `@supabase/supabase-js` | `^2.108.2` | Klien Supabase (auth + database) |
| `zod` | `^4.4.3` | Validasi input |
| `cors` | `^2.8.6` | CORS middleware |
| `dotenv` | `^17.4.2` | Manajemen environment variable |
| `swagger-jsdoc` | `^6.0.0` | Generasi spesifikasi Swagger dari JSDoc |
| `swagger-ui-express` | `^5.0.0` | Serve Swagger UI |
| `nodemon` | `^3.1.14` | Hot-reload (devDependency) |

---

*Dokumentasi ini dihasilkan dari analisis langsung kode sumber repository [mhmdrzkyystiawnn/backend-tabungan](https://github.com/mhmdrzkyystiawnn/backend-tabungan.git). Semua endpoint, aturan validasi, logika bisnis, dan format response bersumber dari implementasi aktual di kode.*
