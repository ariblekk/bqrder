# qrdigo

Sistem Point of Sale (POS) multi-branch untuk restoran/kafe:
pemesanan pelanggan via **QR meja**, layar **kasir (POS)**, dan **dashboard admin** multi-cabang.

## Struktur

```
qrdigo/
├── be/    # REST API (Go + Gin + PostgreSQL + JWT)
└── fe/   # Web app (React + Vite + TypeScript)
```

- **Backend API**: `http://localhost:8080/api/v1` — dokumentasi API di `be/openapi.md`
- **Frontend**: `http://localhost:3000`
- **Role**: `super_admin` > `branch_admin` > `cashier` > `public` (scan QR)

## Persyaratan

- **Node.js** 18+ & pnpm
- **Go** 1.22+ _atau_ **Docker** (untuk backend)
- **PostgreSQL** 14+ (opsional — bisa pakai Supabase)

## 1. Database

Pilih salah satu:

### Opsi A — Supabase (disarankan, gratis)

1. Buat project di [supabase.com](https://supabase.com), salin **DATABASE_URL** (_connection string_).
2. Buka **SQL Editor** → paste isi `be/migrations/full_schema.sql` → **Run**.
   > Skema **tidak membuat user seed** — akun super admin dibuat saat first run via form setup.

### Opsi B — Postgres lokal / Docker

```ps1
createdb qrdigo
psql -d qrdigo -U postgres -f be/migrations/001_initial.sql
psql -d qrdigo -U postgres -f be/migrations/002_order_counters.sql
```

## 2. Backend

```ps1
cd be

# siapkan env
#   Supabase : isi DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME dari DATABASE_URL (port 6543, sslmode=require)
#   Lokal    : .env.example sudah cocok
cp .env.example .env
```

Isi minimal yang wajib diganti di `.env`:

- `JWT_SECRET` & `JWT_REFRESH_SECRET` → secret yang kuat
- `DB_PASSWORD` → password database
- `FRONTEND_URL` → `http://localhost:3000` (harus sama dengan port frontend, untuk CORS)

Jalankan (salah satu):

```ps1
# opsi 1 — Go langsung
go mod download
go run cmd/server/main.go

# opsi 2 — Docker (Postgres + API sekaligus)
docker compose up -d --build
docker compose logs -f api
```

Health check: `http://localhost:8080/api/v1/health`

## 3. Frontend

```ps1
cd fe
pnpm install
pnpm run dev
```

Buka `http://localhost:3000`. Jika backend bukan di `localhost:8080`, ubah `VITE_API_URL` di `fe/.env`.

## 4. Tes Cepat (End-to-End)

1. Buka `http://localhost:3000` → **first run**: isi form setup (nama, email, password) → akun pertama otomatis jadi Super Admin _(ganti password via menu user setelahnya)_
2. **Dashboard** → buat **Cabang** (khusus super admin), lalu pilih cabang di dropdown
3. **Kategori** → buat (mis. "Makanan") → **Produk** → tambah menu
4. **Meja** → tambah meja → buka link **QR** meja
5. Di tab/HP baru: buka link QR → lihat **menu** → pilih item → **checkout** → catat nomor order
6. Kembali ke **POS** (`/pos`) → pesanan muncul → **Proses** → **Terima pembayaran** (stok otomatis berkurang)
7. Pelanggan pantau status di halaman order (auto-refresh setiap 5 detik)

## Lisensi

**Business Source License 1.1 (BUSL-1.1)** — lihat file `LICENSE`.

- Self-host **gratis** untuk 1 deployment, dipakai operasional usahamu sendiri (lihat _Additional Use Grant_).
- Perlu lebih dari 1 project, atau mau nyediain sebagai SaaS/hosted ke pihak lain → butuh lisensi komersial.
- Setelah **Change Date** (2030-09-18) lisensi berubah otomatis jadi **Apache License 2.0**.

## Catatan

- Migrasi otomatis hanya dilakukan oleh container Postgres di `docker-compose.yml`. Kalau pakai Supabase → skema sudah jalan manual via SQL Editor.
- Upload gambar produk tersimpan di disk lokal backend (`UPLOAD_PATH`), bukan di Supabase Storage.
- Pembayaran saat ini hanya tunai (`cash`).

## 5. Deploy Produksi (Docker)

```
qrdigo/
├── docker-compose.yml   # postgres + api + web (nginx, satu origin)
├── be/
└── fe/
```

1. **Env produksi** — salin dan isi semua nilai kuat:
   ```ps1
   cp .env.example .env   # di root repo
   # APP_ENV=production
   # JWT_SECRET / JWT_REFRESH_SECRET → dua string acak >=32 char (openssl rand -hex 32)
   # DB_*           → pakai Supabase pooler (port 6543, sslmode=require)
   # FRONTEND_URL → domain publik (http://...). Backend menolak start
   #                 jika URL masih localhost atau secret masih lemah.
   ```
2. **Bangun & jalankan** (dari root repo):
   ```ps1
   docker compose up -d --build
   ```
   Stacks: `postgres` (opsional, lepaskan jika pakai Supabase), `api` (port 8080, tidak diekspos ke host), `web` (**port 80** — nginx menyajikan SPA dan meneruskan `/api/` & `/uploads/` ke backend, jadi CORS tidak perlu).
3. **HTTPS** — letakkan di belakang reverse proxy (Caddy/Nginx/Traefik) yang mengakhiri TLS; backend sudah menyalakan HSTS di mode produksi.
4. **Rate limit** default: login 10x/menit/IP, order publik 20x/menit/IP. Jika di belakang proxy, pastikan `TRUSTED_PROXIES` berisi subnet proxy (lihat `docker-compose.yml`), agar batas berlaku per-IP pengguna asli.

## Perintah Berguna

```ps1
cd fe && pnpm run build   # build produksi frontend
cd be && go test ./...    # unit test backend
cd be && go build ./...   # build backend
```
