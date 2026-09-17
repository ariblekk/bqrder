# bqrder API Documentation

Dokumentasi REST API untuk backend **bqrder**.

- **Base URL**: `http://localhost:8080/api/v1`
- **Content-Type**: `application/json`

## Autentikasi

Sebagian besar endpoint membutuhkan token JWT pada header `Authorization`:

```
Authorization: Bearer <access_token>
```

Payload JWT berisi:

| Claim | Tipe | Deskripsi |
|---|---|---|
| `user_id` | int | ID user |
| `role` | string | `super_admin` / `branch_admin` / `cashier` |
| `branch_id` | int | Cabang tempat user terdaftar |

**Kode error umum:**

| Kode | Keterangan |
|---|---|
| `200` | Sukses |
| `201` | Berhasil dibuat |
| `400` | Request body invalid / validasi gagal |
| `401` | Token tidak ada / tidak valid / kedaluwarsa |
| `403` | Role tidak berhak mengakses endpoint |
| `404` | Resource tidak ditemukan |
| `409` | Konflik data |
| `500` | Internal server error |

## Format Response

**Sukses:**
```json
{
  "success": true,
  "message": "string",
  "data": { ... }
}
```

**Gagal:**
```json
{
  "success": false,
  "message": "string"
}
```

---

## Schemas

### User
```json
{
  "id": 1,
  "branch_id": 1,
  "name": "Kasir Satu",
  "email": "kasir1@bqrder.com",
  "role": "cashier",
  "created_at": "2026-09-15T10:00:00Z"
}
```

### AuthResponse
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "branch_id": 1,
    "name": "Super Admin",
    "email": "admin@bqrder.com",
    "role": "super_admin"
  }
}
```

### Table
```json
{
  "id": 1,
  "branch_id": 1,
  "table_number": "T-01",
  "qr_token": "a3f92b1c...",
  "qr_link": "http://localhost:8080/api/v1/public/table/a3f92b1c...",
  "capacity": 4,
  "is_active": true
}
```

### Category
```json
{
  "id": 1,
  "branch_id": 1,
  "name": "Makanan",
  "description": "Semua menu makanan",
  "created_at": "2026-09-15T10:00:00Z"
}
```

### Product
```json
{
  "id": 1,
  "branch_id": 1,
  "category_id": 1,
  "category_name": "Makanan",
  "name": "Nasi Goreng",
  "description": "Nasi goreng spesial",
  "price": 25000,
  "stock": 50,
  "image_url": "http://localhost:8080/uploads/products/product_1_1700000000.jpg",
  "is_active": true,
  "created_at": "2026-09-15T10:00:00Z"
}
```

### Order
```json
{
  "id": 1,
  "branch_id": 1,
  "order_number": "ORD-20260915-001",
  "table_id": 1,
  "customer_name": "Budi",
  "total_amount": 50000,
  "status": "pending",
  "payment_status": "unpaid",
  "payment_method": null,
  "created_at": "2026-09-15T10:00:00Z",
  "updated_at": "2026-09-15T10:00:00Z",
  "items": [
    {
      "id": 1,
      "order_id": 1,
      "product_id": 1,
      "product_name": "Nasi Goreng",
      "quantity": 2,
      "price": 25000,
      "notes": "Tanpa pedas",
      "subtotal": 50000
    }
  ]
}
```

### Order Status & Payment

`status`:
| Nilai | Keterangan |
|---|---|
| `pending` | Pesanan baru dibuat |
| `processing` | Sedang diproses dapur/bar |
| `completed` | Selesai (diterapkan otomatis saat pembayaran) |
| `cancelled` | Dibatalkan |

`payment_status`:
| Nilai | Keterangan |
|---|---|
| `unpaid` | Belum dibayar |
| `paid` | Sudah dibayar |
| `refunded` | Refund |

`payment_method`:
| Nilai | Keterangan |
|---|---|
| `cash` | Tunai (saat ini satu-satunya metode) |

---

## Auth Module `/auth`

### POST `/auth/login`
Login untuk Admin/Kasir.

**Request:**
```json
{
  "email": "admin@bqrder.com",
  "password": "admin123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "branch_id": 1,
      "name": "Super Admin",
      "email": "admin@bqrder.com",
      "role": "super_admin"
    }
  }
}
```

**Error 401:** `{ "success": false, "message": "invalid email or password" }`<br>
**Error 401:** `{ "success": false, "message": "branch is inactive" }`

### POST `/auth/refresh`
Menukar refresh token dengan access token (dan refresh token baru).

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:** Struktur sama dengan `/auth/login`.

---

## Public Module `/public` — Tanpa Autentikasi

### GET `/public/table/:qr_token`
Validasi QR token meja.

**Path Params:** `qr_token` — token unik meja.

**Response 200:**
```json
{
  "success": true,
  "message": "table validated",
  "data": {
    "id": 1,
    "branch_id": 1,
    "table_number": "T-01",
    "qr_token": "a3f92b1c...",
    "qr_link": "/api/v1/public/table/a3f92b1c...",
    "capacity": 4,
    "is_active": true
  }
}
```

**Error 404:** QR token tidak valid atau meja nonaktif.

### GET `/public/menu?qr_token=...`
Mengambil daftar kategori dan produk aktif pada meja/cabang.

**Query Params:**

| Param | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `qr_token` | string | ya | QR token meja untuk menentukan cabang |

**Response 200:**
```json
{
  "success": true,
  "message": "menu retrieved",
  "data": [
    {
      "id": 1,
      "name": "Makanan",
      "description": "Semua menu makanan",
      "products": [
        {
          "id": 1,
          "name": "Nasi Goreng",
          "description": "Nasi goreng spesial",
          "price": 25000,
          "stock": 50,
          "image_url": "http://localhost:8080/uploads/products/product_1_1700000000.jpg"
        }
      ]
    }
  ]
}
```

### POST `/public/orders?qr_token=...`
Checkout / membuat pesanan baru sebagai pelanggan.

**Query Params:**

| Param | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `qr_token` | string | ya | QR token meja (penentu cabang & meja) |

**Request:**
```json
{
  "customer_name": "Budi",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "notes": "Tanpa pedas"
    }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "order created successfully",
  "data": {
    "id": 1,
    "branch_id": 1,
    "order_number": "ORD-20260915-001",
    "table_id": 1,
    "customer_name": "Budi",
    "total_amount": 50000,
    "status": "pending",
    "payment_status": "unpaid",
    "payment_method": null,
    "created_at": "2026-09-15T10:00:00Z",
    "updated_at": "2026-09-15T10:00:00Z",
    "items": [...]
  }
}
```

**Error 400:** produk tidak ditemukan / produk nonaktif / `items` kosong.

### GET `/public/orders/:order_number`
Monitoring status pesanan pelanggan.

**Path Params:** `order_number` — contoh: `ORD-20260915-001`.

**Response 200:** Struktur Order lengkap dengan `items`.

**Error 404:** `{ "success": false, "message": "order not found" }`

---

## Admin Module `/admin` — Auth + Role Admin (`super_admin`, `branch_admin`)

> **Super Admin** dapat memilih cabang lewat query parameter `?branch_id=`. Tanpa parameter, memakai cabang pada token.

### Meja (Tables)

#### GET `/admin/tables`
Mengambil daftar semua meja.

**Response 200:**
```json
{
  "success": true,
  "message": "tables retrieved",
  "data": [ { "id": 1, "branch_id": 1, "table_number": "T-01", "qr_token": "...", "qr_link": "...", "capacity": 4, "is_active": true } ]
}
```

#### POST `/admin/tables`
Membuat meja baru (QR token dibuat otomatis).

**Request:**
```json
{
  "table_number": "T-01",
  "capacity": 4,
  "is_active": true
}
```

**Response 201:** Struktur Table, termasuk `qr_link`.

#### PUT `/admin/tables/:id`
Mengupdate meja berdasarkan ID.

**Request:**
```json
{
  "table_number": "T-01 A",
  "capacity": 6,
  "is_active": false
}
```

> Semua field opsional (partial update).

#### DELETE `/admin/tables/:id`
Menghapus meja.

**Response 200:**
```json
{ "success": true, "message": "table deleted successfully" }
```

#### GET `/admin/tables/:id/qr`
Membuat & mengembalikan QR token/link unik meja.

**Response 200:**
```json
{
  "success": true,
  "message": "QR link generated",
  "data": {
    "table_id": "1",
    "table_number": "T-01",
    "qr_token": "a3f92b1c...",
    "qr_link": "http://localhost:8080/api/v1/public/table/a3f92b1c..."
  }
}
```

### Kategori (Categories)

#### GET `/admin/categories`
Daftar kategori.

#### POST `/admin/categories`
Buat kategori.

**Request:**
```json
{
  "name": "Minuman",
  "description": "Semua menu minuman"
}
```

#### PUT `/admin/categories/:id`
Update kategori (partial).

**Request:**
```json
{ "name": "Minuman Dingin", "description": "Minuman ber-es" }
```

#### DELETE `/admin/categories/:id`
Hapus kategori. Gagal (`400`) jika masih dipakai produk.

### Produk (Products)

#### GET `/admin/products`
Daftar produk pada cabang (paginated).

**Query Params:**

| Param | Tipe | Opsional | Deskripsi |
|---|---|---|---|
| `page` | int | ya | Halaman, mulai `1` (default) |
| `limit` | int | ya | Jumlah per halaman, `1-100` (default `10`) |
| `branch_id` | int | ya | Hanya untuk super_admin, override cabang |

**Response 200:**
```json
{
  "success": true,
  "message": "products retrieved",
  "data": [ { "id": 1, "name": "Es Teh Manis", "price": 5000, ... } ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

#### POST `/admin/products`
Buat produk baru.

**Request:**
```json
{
  "category_id": 1,
  "name": "Es Teh Manis",
  "description": "Teh manis dingin",
  "price": 5000,
  "stock": 100,
  "is_active": true
}
```

**Error 400:** kategori tidak ditemukan.

#### PUT `/admin/products/:id`
Update produk (partial).

**Request:**
```json
{
  "category_id": 1,
  "name": "Es Teh Manis Jumbo",
  "price": 7000,
  "stock": 80,
  "is_active": true
}
```

#### DELETE `/admin/products/:id`
Hapus produk. Gagal (`400`) jika masih dipakai di `order_items`.

#### POST `/admin/products/:id/image`
Upload gambar produk.

**Content-Type:** `multipart/form-data`

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `image` | file | ya | Format: `jpg`, `jpeg`, `png`, `webp`; maks 5 MB |

**Response 200:** Struktur Product dengan `image_url` terisi.

**Error 400:** file bukan gambar, ukuran > 5 MB, atau format tidak didukung.

### Laporan Penjualan (Reports)

#### GET `/admin/reports/sales?period=...`
Ringkasan penjualan.

**Query Params:**

| Param | Tipe | Opsional | Deskripsi |
|---|---|---|---|
| `period` | string | ya | `daily` (default) atau `monthly` |
| `start_date` | string | ya | Format `YYYY-MM-DD` (custom range) |
| `end_date` | string | ya | Format `YYYY-MM-DD` (custom range) |

- Jika `period=daily` → ringkasan hari ini.
- Jika `period=monthly` → ringkasan bulan ini.
- Jika diberikan `start_date` & `end_date` → laporan lengkap rentang tanggal.

**Response 200 (period=daily/monthly):**
```json
{
  "success": true,
  "message": "sales report retrieved",
  "data": {
    "total_orders": 25,
    "total_revenue": 1250000,
    "completed_orders": 20,
    "cancelled_orders": 2,
    "pending_orders": 3,
    "average_order_value": 50000
  }
}
```

**Response 200 (custom range):**
```json
{
  "success": true,
  "message": "sales report retrieved",
  "data": {
    "period": "",
    "start_date": "2026-09-01T00:00:00Z",
    "end_date": "2026-09-15T00:00:00Z",
    "summary": {
      "total_orders": 100,
      "total_revenue": 5000000,
      "completed_orders": 90,
      "cancelled_orders": 5,
      "pending_orders": 5,
      "average_order_value": 50000
    },
    "daily_sales": [
      { "date": "2026-09-01", "total_orders": 10, "total_revenue": 500000 }
    ],
    "top_products": [
      { "product_id": 1, "product_name": "Nasi Goreng", "total_sold": 30, "total_revenue": 750000 }
    ]
  }
}
```

#### GET `/admin/reports/sales/daily?date=YYYY-MM-DD`
Ringkasan penjualan harian spesifik. Tanpa `date` → hari ini.

**Query Params:**

| Param | Tipe | Opsional | Deskripsi |
|---|---|---|---|
| `date` | string | ya | Format `YYYY-MM-DD` |

### User / Kasir

#### POST `/admin/users`
Registrasi akun Kasir baru.

**Rule per role:**
- **super_admin**: bisa membuat `branch_admin` atau `cashier` untuk cabang mana pun.
- **branch_admin**: hanya bisa membuat `cashier` untuk cabangnya sendiri.

**Request:**
```json
{
  "branch_id": 1,
  "name": "Kasir Satu",
  "email": "kasir1@bqrder.com",
  "password": "kasir123",
  "role": "cashier"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "user created successfully",
  "data": {
    "id": 2,
    "branch_id": 1,
    "name": "Kasir Satu",
    "email": "kasir1@bqrder.com",
    "role": "cashier"
  }
}
```

**Error 400:** email sudah terdaftar, role tidak valid, tidak boleh membuat `super_admin`.

#### GET `/admin/users`
Daftar semua user (branch_admin hanya melihat user cabangnya).

#### PUT `/admin/users/:id`
Update nama, email, role, dan opsional password.

**Request:**
```json
{
  "name": "Kasir Satu Updated",
  "email": "kasir1@bqrder.com",
  "password": "kasirbaru123",
  "role": "cashier"
}
```

**Rule per role:**
- **super_admin**: bisa update user cabang mana pun, tidak bisa menetapkan role `super_admin`.
- **branch_admin**: hanya bisa update `cashier` dalam cabangnya sendiri.

**Error 400:** email sudah dipakai user lain, role tidak valid. **Error 404:** user tidak ditemukan.

### Branch (Khusus Super Admin)

#### GET `/admin/branches`
Daftar semua cabang.

**Role:** `super_admin` saja.

#### POST `/admin/branches`
Buat cabang baru.

**Request:**
```json
{
  "name": "bqrder Cabang Bandung",
  "address": "Jl. Braga No. 10, Bandung",
  "phone": "022-1234567"
}
```

#### PUT `/admin/branches/:id`
Update cabang (partial).

**Request:**
```json
{
  "name": "bqrder Cabang Bandung",
  "address": "Jl. Braga No. 10, Bandung",
  "phone": "022-1234567",
  "is_active": true
}
```

---

## POS Module `/pos` — Auth + Role `super_admin`, `branch_admin`, `cashier`

### GET `/pos/orders`
Mengambil daftar semua pesanan aktif (`pending` dan `processing`) pada cabang.

**Response 200:**
```json
{
  "success": true,
  "message": "orders retrieved",
  "data": [
    {
      "id": 1,
      "branch_id": 1,
      "order_number": "ORD-20260915-001",
      "table_id": 1,
      "customer_name": "Budi",
      "total_amount": 50000,
      "status": "pending",
      "payment_status": "unpaid",
      "payment_method": null,
      "created_at": "2026-09-15T10:00:00Z",
      "updated_at": "2026-09-15T10:00:00Z",
      "items": [...]
    }
  ]
}
```

### PUT `/pos/orders/:id/status`
Mengubah status pesanan.

**Request:**
```json
{
  "status": "processing"
}
```

Nilai `status` yang diterima: `pending`, `processing`, `completed`, `cancelled`.

**Validasi:**
- Order yang sudah `cancelled` atau `completed` tidak dapat diubah.
- Order berstatus `paid` tidak dapat dibatalkan.

**Response 200:** Struktur Order lengkap.

### POST `/pos/orders/:id/pay`
Konfirmasi transaksi pembayaran di kasir.

**Request:**
```json
{
  "payment_method": "cash",
  "amount_paid": 100000
}
```

`payment_method` default `cash`. `amount_paid` untuk referensi (belum dihitung kembalian).

**Efek:**
- Status → `completed`, payment_status → `paid`.
- Stok produk dikurangi sesuai jumlah item.
- Gagal (`400`) jika stok tidak cukup.

**Response 200:** Struktur Order lengkap.

### POST `/pos/orders/direct`
Buat pesanan manual dari kasir (walk-in / takeaway).

**Request:**
```json
{
  "table_id": 1,
  "customer_name": "Walk-in Customer",
  "items": [
    { "product_id": 1, "quantity": 1, "notes": "" },
    { "product_id": 2, "quantity": 2, "notes": "Extra es" }
  ]
}
```

`table_id` opsional (untuk takeaway boleh tidak ada). `customer_name` wajib.

**Response 201:** Struktur Order lengkap.

---

## Lainnya

### GET `/health`
Health check server.

**Response 200:**
```json
{
  "success": true,
  "message": "server is running"
}
```

### GET `/uploads/products/:filename`
Akses file gambar produk (statis).

---

## Contoh Lengkap — Alur End-to-End

**1. Login super admin**
```bash
curl -X POST $BASE/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@bqrder.com","password":"admin123"}'
# simpan access_token
```

**2. Buat cabang baru**
```bash
curl -X POST $BASE/api/v1/admin/branches -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"bqrder Cabang Bandung","address":"Jl. Braga No. 10","phone":"022-1234567"}'
# catat branch_id
```

**3. Buat kategori & produk di cabang tersebut**
```bash
curl -X POST "$BASE/api/v1/admin/categories?branch_id=2" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Makanan","description":"Menu utama"}'

curl -X POST "$BASE/api/v1/admin/products?branch_id=2" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category_id":1,"name":"Nasi Goreng","price":25000,"stock":50,"is_active":true}'
```

**4. Buat meja & dapatkan qr_token**
```bash
curl -X POST "$BASE/api/v1/admin/tables?branch_id=2" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"table_number":"T-01","capacity":4}'
# simpan qr_token
```

**5. Pelanggan scan QR & checkout**
```bash
curl -X POST "$BASE/api/v1/public/orders?qr_token=$QR" -H "Content-Type: application/json" \
  -d '{"customer_name":"Budi","items":[{"product_id":1,"quantity":2}]}'
# simpan order_id & order_number
```

**6. Kasir proses & bayar**
```bash
# ubah status ke processing
curl -X PUT $BASE/api/v1/pos/orders/$ORDER_ID/status -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"processing"}'

# konfirmasi pembayaran (stok otomatis berkurang)
curl -X POST $BASE/api/v1/pos/orders/$ORDER_ID/pay -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"payment_method":"cash"}'
```

**7. Pelanggan cek status**
```bash
curl $BASE/api/v1/public/orders/ORD-20260915-001
```

---

## Kode Error Per Endpoint

| Endpoint | Error 400 | Error 401 | Error 403 | Error 404 |
|---|---|---|---|---|
| `POST /auth/login` | — | email/password salah, branch nonaktif | — | — |
| `POST /auth/refresh` | body invalid | refresh token invalid | — | user tidak ditemukan |
| `GET /public/table/:qr_token` | — | — | — | QR tidak valid / meja nonaktif |
| `GET /public/menu` | — | — | — | QR tidak valid |
| `POST /public/orders` | produk tidak valid, items kosong | — | — | QR tidak valid |
| `GET /public/orders/:order_number` | — | — | — | order tidak ditemukan |
| `GET/POST/PUT/DELETE /admin/tables*` | body invalid | token invalid | role bukan admin | ID tidak ditemukan |
| `/admin/categories*` | kategori dipakai produk (DELETE) | token invalid | role bukan admin | ID tidak ditemukan |
| `/admin/products*` | kategori tidak ada, file invalid | token invalid | role bukan admin | ID tidak ditemukan |
| `GET /admin/reports/sales*` | format tanggal salah | token invalid | role bukan admin | — |
| `POST/PUT /admin/users` | email terdaftar, role invalid | token invalid | akses lintas cabang, role terlarang | user/branch tidak ada |
| `/admin/branches*` | body invalid | token invalid | bukan super_admin | ID tidak ditemukan |
| `GET /pos/orders` | — | token invalid | bukan admin/kasir | — |
| `PUT /pos/orders/:id/status` | status invalid, order selesai/dibatalkan | token invalid | bukan admin/kasir | ID tidak ditemukan |
| `POST /pos/orders/:id/pay` | stok tidak cukup, sudah dibayar | token invalid | bukan admin/kasir | ID tidak ditemukan |
| `POST /pos/orders/direct` | produk invalid, items kosong | token invalid | bukan admin/kasir | table dibutuhkan |