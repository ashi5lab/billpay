-- Soft deletion uses deleted_at on every user-editable entity. Never DELETE business data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS zalish_store_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), store_name TEXT NOT NULL DEFAULT 'Zalish Boutique',
  address TEXT NOT NULL DEFAULT '', contact_number TEXT NOT NULL DEFAULT '', gstin TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO zalish_store_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS zalish_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
-- Bootstrap administrator. Sign in with username: admin, password: root, then change this before real use.
INSERT INTO zalish_users (name, username, password_hash, role)
VALUES ('Administrator', 'admin', crypt('root', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO NOTHING;
CREATE TABLE IF NOT EXISTS zalish_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS zalish_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, default_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0, category TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS zalish_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), expense_name TEXT NOT NULL, category_id UUID REFERENCES zalish_expense_categories(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0), expense_date DATE NOT NULL DEFAULT CURRENT_DATE, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'UPI';
ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS payment_mode_other TEXT;
CREATE TABLE IF NOT EXISTS zalish_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), receipt_number TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, customer_phone TEXT,
  customer_place TEXT, advance_amount NUMERIC(12,2) NOT NULL CHECK (advance_amount > 0), notes TEXT, issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_invoice_id UUID, deleted_at TIMESTAMPTZ
);
ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'UPI';
ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS payment_mode_other TEXT;
CREATE TABLE IF NOT EXISTS zalish_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, customer_phone TEXT,
  customer_place TEXT, subtotal NUMERIC(12,2) NOT NULL, discount NUMERIC(12,2) NOT NULL DEFAULT 0, tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0, grand_total NUMERIC(12,2) NOT NULL, advance_id UUID UNIQUE REFERENCES zalish_advances(id),
  advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0, balance_due NUMERIC(12,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'UPI';
ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS payment_mode_other TEXT;
ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PAID';
DO $$ BEGIN
  ALTER TABLE zalish_advances ADD CONSTRAINT zalish_advances_settled_invoice_fk FOREIGN KEY (settled_invoice_id) REFERENCES zalish_invoices(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS zalish_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES zalish_invoices(id), item_id UUID REFERENCES zalish_items(id),
  item_name TEXT NOT NULL, quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0), unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), line_total NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS zalish_invoice_created_idx ON zalish_invoices(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS zalish_expense_date_idx ON zalish_expenses(expense_date DESC) WHERE deleted_at IS NULL;
