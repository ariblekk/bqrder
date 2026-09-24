# qrdigo Backend

RESTful API backend untuk aplikasi Point of Sale (POS) bernama **qrdigo**, dibangun dengan **Go** dan **Gin Framework**, menggunakan **PostgreSQL** sebagai database, serta **JWT** untuk autentikasi dengan RBAC.

## Fitur

- **Multi-branch**: Mendukung beberapa cabang toko dengan hierarki _Super Admin_ > _Branch Admin_ > _Kasir_.
- **Manajemen Lengkap**: Meja (QR code), kategori produk, produk (dengan upload gambar), user/kasir.
- **Modul POS**: Pesanan aktif, update status pesanan, pemrosesan pembayaran tunai, dan order walk-in/takeaway.
- **Modul Public**: Validasi QR meja, daftar menu, checkout pesanan pelanggan, dan monitoring status pesanan.
- **RBAC berbasis JWT**: Token berisi `user_id`, `role`, dan `branch_id`; refresh token terpisah.
- **Response JSON konsisten**: `{ "success": boolean, "message": string, "data": any }`.

## Server Dependencies (Go)

| Dependency                                              | Version | Kegunaan                   |
| ------------------------------------------------------- | ------- | -------------------------- |
| [gin-gonic/gin](https://github.com/gin-gonic/gin)       | v1.11+  | Web framework              |
| [gin-contrib/cors](https://github.com/gin-contrib/cors) | v1.7+   | CORS middleware            |
| [github.com/lib/pq](https://github.com/lib/pq)          | v1.12+  | PostgreSQL driver          |
| [golang-jwt/jwt/v5](https://github.com/golang-jwt/jwt)  | v5.3+   | JWT signing & verification |
| [joho/godotenv](https://github.com/joho/godotenv)       | v1.5+   | Load `.env`                |
| golang.org/x/crypto                                     | v0.5+   | bcrypt password hashing    |

## Struktur Project (Clean Architecture)

```
be/
├── be.go                        # Entry point (go run be.go)
├── config/config.go              # Load konfigurasi dari .env
├── internal/
│   ├── database/database.go      # Koneksi PostgreSQL (connection pool)
│   ├── domain/
│   │   ├── entities/             # Entity & DTO (branch, user, table, category, product, order, report)
│   │   └── repositories/         # Interface repository
│   ├── repositories/postgres/    # Implementasi repository (SQL)
│   ├── usecases/                 # Business logic / use case
│   ├── handlers/                 # HTTP handler (controller)
│   ├── middleware/               # Auth JWT, RBAC, recovery
│   └── routes/routes.go          # Registrasi semua route
├── migrations/                   # SQL migration (skema + seed, order counters)
├── pkg/
│   ├── jwt/                      # JWT manager (access & refresh token)
│   ├── response/                 # Format response terpusat
│   └── utils/                    # Helper (bcrypt, QR token, order number, pagination)
├── uploads/products/             # Direktori gambar produk
├── Dockerfile                    # Build image API
├── docker-compose.yml            # Postgres + API
├── .env.example                  # Contoh konfigurasi
└── openapi.md                    # Dokumentasi API
```

## Persyaratan

- **Go** 1.22+
- **PostgreSQL** 14+

## Instalasi & Menjalankan

```bash
# 1. Clone repository
git clone <repo-url> qrdigo
cd qrdigo/be

# 2. Salin file env
cp .env.example .env
#   lalu sesuaikan nilai DB_PASSWORD, JWT_SECRET, dll.

# 3. Buat database
createdb qrdigo

# 4. Jalankan migrasi (skema + seed) — urutan 001 lalu 002
psql -d qrdigo -U postgres -f migrations/001_initial.sql
psql -d qrdigo -U postgres -f migrations/002_order_counters.sql

# 5. Install dependensi
go mod download

# 6. Jalankan server
go run be.go
```

Server akan berjalan di `http://localhost:8080` (default).

### Menjalankan dengan Docker

```bash
# 1. Siapkan .env (JWT_SECRET, dll.) — .env.example sudah kompatibel
cp .env.example .env

# 2. Bangun & jalankan Postgres + API
docker compose up -d --build

# 3. Cek log API
docker compose logs -f api
```

Migrasi dijalankan otomatis oleh container Postgres dari `./migrations/`.
Upload produk tersimpan di volume `qrdigo_uploads`.

### First Run — Setup Super Admin

Tidak ada akun dan cabang seed. Saat database masih kosong, form setup di frontend (atau `POST /api/v1/auth/bootstrap`) membuat **cabang pertama yang diisi user** beserta akun **super_admin** pertama, lalu langsung auto-login. Setelah akun pertama ada, endpoint bootstrap menolak dengan 409.

## Konfigurasi `.env`

| Variabel             | Default                 | Deskripsi                                    |
| -------------------- | ----------------------- | -------------------------------------------- |
| `DB_HOST`            | `localhost`             | Host PostgreSQL                              |
| `DB_PORT`            | `5432`                  | Port PostgreSQL                              |
| `DB_USER`            | `postgres`              | User database                                |
| `DB_PASSWORD`        | _(kosong)_              | Password database                            |
| `DB_NAME`            | `qrdigo`                | Nama database                                |
| `DB_SSLMODE`         | `disable`               | SSL mode PostgreSQL                          |
| `JWT_SECRET`         | _(wajib diganti)_       | Secret untuk access token                    |
| `JWT_REFRESH_SECRET` | _(wajib diganti)_       | Secret untuk refresh token                   |
| `JWT_EXPIRY_HOURS`   | `24`                    | Umur access token (jam)                      |
| `JWT_REFRESH_DAYS`   | `7`                     | Umur refresh token (hari)                    |
| `SERVER_PORT`        | `8080`                  | Port HTTP server                             |
| `BASE_URL`           | `http://localhost:8080` | URL dasar untuk generate QR link & image URL |
| `FRONTEND_URL`       | `http://localhost:3000` | Origin frontend (CORS)                       |
| `UPLOAD_PATH`        | `./uploads`             | Direktori penyimpanan gambar                 |

## Role & Hak Akses

| Role           | Hak Akses                                                                         |
| -------------- | --------------------------------------------------------------------------------- |
| `super_admin`  | Akses penuh semua cabang, manajemen branch, user, meja, produk, kategori, laporan |
| `branch_admin` | Akses penuh dalam cabangnya: meja, produk, kategori, user (hanya kasir), laporan  |
| `cashier`      | Khusus modul POS: pesanan, status, pembayaran, order langsung                     |
| `public`       | Tanpa autentikasi: scan QR meja, menu, checkout, status pesanan                   |

> Super Admin dapat menentukan cabang target lewat query parameter `?branch_id=`. Jika tidak diberikan, default ke cabang di token.

## Dokumentasi API

Dokumentasi lengkap semua endpoint tercantum di **[openapi.md](./openapi.md)**.

Ringkasan modul:

- `/api/v1/auth` — `POST /login`, `POST /refresh`, `GET/POST /bootstrap` (first-run setup super admin)
- `/api/v1/public` — QR table, menu, checkout, status order (tanpa auth)
- `/api/v1/admin` — tables, categories, products (paginated `?page=&limit=`), reports, users (`PUT /users/:id`), branches (Auth + Admin)
- `/api/v1/pos` — active orders, status update, pay, direct order (Auth + Admin/Kasir)
- `/api/v1/health` — health check

## Contoh Alur Penggunaan

### 1. Setup Awal (Hanya Saat Database Masih Kosong)

```bash
curl -X POST http://localhost:8080/api/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"name":"Super Admin","email":"admin@qrdigo.com","password":"ganti-ini-123","branch":{"name":"Kafe Melati","address":"Jl. Melati 12","phone":"08123456789"}}'
```

Response memuat access/refresh token langsung.

### 2. Login Admin

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qrdigo.com","password":"admin123"}'
```

### 2. Buat Meja & Ambil QR Link

```bash
curl -X POST http://localhost:8080/api/v1/admin/tables \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"table_number":"T-01","capacity":4}'

# Ambil qr_link dari response, lalu gunakan sebagai qr_token untuk endpoint public
curl http://localhost:8080/api/v1/public/table/<qr_token>
```

### 3. Customer Order via QR

```bash
curl -X POST "http://localhost:8080/api/v1/public/orders?qr_token=<qr_token>" \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Budi","items":[{"product_id":1,"quantity":2,"notes":"Tanpa pedas"}]}'
```

### 4. Pembayaran di Kasir

```bash
curl -X POST http://localhost:8080/api/v1/pos/orders/<order_id>/pay \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"payment_method":"cash"}'
```

## Alur Pesanan

```
pelanggan scan QR meja
  -> POST /public/orders  (status: pending, payment: unpaid)
  -> POS menerima & memproses  (PUT /pos/orders/:id/status -> processing)
  -> Kasir konfirmasi bayar   (POST /pos/orders/:id/pay -> completed, paid, stock dikurangi)
  -> Pelanggan monitor status (GET /public/orders/:order_number)
  -> Pesanan dibatalkan       (status: cancelled, hanya jika belum dibayar)
```

## Testing & Quality

```bash
go build ./...      # build seluruh project
go vet ./...        # static analysis
gofmt -l .          # cek format (harus tanpa output)
go test ./...       # unit test (jwt, utils, auth usecase, order usecase)
```

## Roadmap / Kendala yang Perlu Diperhatikan

- **Payment gateway**: Saat ini hanya tunai (`cash`). Integrasi payment gateway (QRIS/e-wallet) dapat dilakukan dengan memperluas `PaymentMethod` dan menambahkan webhook konfirmasi.
- **Object storage (S3)**: Upload gambar produk saat ini ke local disk. Migrasi ke S3/MinIO cukup mengganti implementasi `UploadImage` di `ProductUseCase`.
- **Refresh token revocation**: Saat ini refresh token bersifat stateless. Jika perlu revoke, tambahkan tabel `refresh_tokens`.

## Lisensi

Proyek ini bersifat proprietary dan dikembangkan untuk kebutuhan internal.
