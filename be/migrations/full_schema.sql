-- =====================================================
-- qrdigo POS — FULL SCHEMA untuk Supabase SQL Editor
-- Postgres 14+. Paste seluruh isi file ini, lalu RUN.
-- =====================================================
-- CATATAN:
-- 1. Auth tetap pakai JWT milik backend (bcrypt di password_hash).
--    JANGAN pakai Supabase Auth untuk login app, hash-nya beda.
-- 2. Backend Go terhubung via connection string (role superuser),
--    jadi RLS sengaja TIDAK diaktifkan. Kalau mau pakai Supabase
--    Client (anxios ke domain supabase), aktifkan RLS per tabel.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Branches ----------
CREATE TABLE IF NOT EXISTS branches (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    address     TEXT NOT NULL,
    phone       VARCHAR(30) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    branch_id     INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'cashier')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ---------- Audit Logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
    id         SERIAL PRIMARY KEY,
    branch_id  INTEGER,
    user_id    INTEGER,
    user_role  VARCHAR(20),
    action     VARCHAR(50) NOT NULL,
    entity     VARCHAR(50) NOT NULL,
    entity_id  INTEGER,
    detail     TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_logs(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);

-- ---------- Tables ----------
CREATE TABLE IF NOT EXISTS tables (
    id           SERIAL PRIMARY KEY,
    branch_id    INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    qr_token     VARCHAR(64) NOT NULL UNIQUE,
    capacity     INTEGER NOT NULL DEFAULT 4,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_branch ON tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_tables_qr ON tables(qr_token);

-- ---------- Categories ----------
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    branch_id   INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_branch ON categories(branch_id);

-- ---------- Products ----------
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name            VARCHAR(200) NOT NULL,
    description     TEXT DEFAULT '',
    price           NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock           INTEGER NOT NULL DEFAULT 0,
    is_unlimited    BOOLEAN NOT NULL DEFAULT FALSE,
    image_url       TEXT DEFAULT '',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    featured_order  INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_branch ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(branch_id, is_featured, featured_order) WHERE is_featured = TRUE;

-- ---------- Product Variants (pilih 1, replace harga, mis. Ice/Hot, Size) ----------
CREATE TABLE IF NOT EXISTS product_variants (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    price       NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- ---------- Product Options (tambahan opsional, multi-select, mis. Milk, Extra Shot) ----------
CREATE TABLE IF NOT EXISTS product_options (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    price       NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id);

-- ---------- Orders ----------
CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL PRIMARY KEY,
    branch_id      INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_number   VARCHAR(30) NOT NULL UNIQUE,
    table_id       INTEGER REFERENCES tables(id) ON DELETE SET NULL,
    customer_name  VARCHAR(100) DEFAULT '',
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    payment_method VARCHAR(20),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- ---------- Order Items ----------
CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id  INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    price       NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes       TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);

-- ---------- Order Item Options (many-to-many) ----------
CREATE TABLE IF NOT EXISTS order_item_options (
    order_item_id  INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    option_id      INTEGER NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    PRIMARY KEY (order_item_id, option_id)
);

-- ---------- Order Counters (urutan nomor pesanan per cabang per hari) ----------
CREATE TABLE IF NOT EXISTS order_counters (
    branch_id  INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    seq        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (branch_id, order_date)
);

-- ---------- Trigger: auto-update updated_at orders ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Akun super admin & cabang pertama dibuat otomatis saat first run
-- melalui POST /api/v1/auth/bootstrap (lihat Login page apps).
-- Tidak ada seed user di sini lagi.