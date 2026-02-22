-- ============================================================================
-- Greenfield CRM — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================================

-- ─── Helper: auto-update updated_at trigger ────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Users ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  email        text        NOT NULL,
  role         text        NOT NULL DEFAULT 'Employee' CHECK (role IN ('Admin', 'Employee')),
  status       text        NOT NULL DEFAULT 'Pending'   CHECK (status IN ('Active', 'Pending', 'Disabled')),
  gemini_api_key text,
  preferred_model text,
  notification_settings jsonb DEFAULT '{"emailNotifications": true, "smsNotifications": false, "marketingEmails": false}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted      boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Farmers ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  gender          text        CHECK (gender IN ('Male', 'Female', 'Other')),
  region          text,
  district        text,
  society         text,
  community       text,
  contact         text,
  age             integer,
  education_level text        CHECK (education_level IN ('None', 'Primary', 'JHS', 'SHS', 'Tertiary', 'Other')),
  farm_size       numeric,
  crops_grown     text[]      DEFAULT '{}',
  status          text        DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  join_date       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted         boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER farmers_updated_at
  BEFORE UPDATE ON farmers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Employees ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  role        text        NOT NULL CHECK (role IN ('Manager', 'Field Agent', 'Accountant', 'Support')),
  salary      numeric,
  start_date  timestamptz NOT NULL,
  status      text        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
  is_verified boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted     boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Suppliers ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  contact_person  text NOT NULL,
  email           text NOT NULL,
  phone           text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted         boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Products ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  category    text        NOT NULL CHECK (category IN ('Seeds', 'Fertilizers', 'Pesticides', 'Equipment', 'Other')),
  supplier_id uuid        REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity    integer     NOT NULL DEFAULT 0,
  price       numeric     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted     boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Transactions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN ('Income', 'Expense')),
  category      text NOT NULL CHECK (category IN ('Salary', 'Travel', 'Equipment', 'Utilities', 'Marketing', 'Purchase', 'Investment', 'Loan', 'Sales', 'Other')),
  description   text NOT NULL,
  amount        numeric NOT NULL,
  date          timestamptz NOT NULL,
  employee_name text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted       boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Farmer Groups ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmer_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  description text,
  season_year text    NOT NULL,
  farmer_ids  text[]  DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted     boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER farmer_groups_updated_at
  BEFORE UPDATE ON farmer_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Farmer Requests ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmer_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    uuid        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  group_id     uuid        REFERENCES farmer_groups(id) ON DELETE SET NULL,
  season_year  text        NOT NULL,
  items        jsonb       NOT NULL DEFAULT '[]',
  grand_total  numeric     NOT NULL DEFAULT 0,
  status       text        NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Delivered')),
  payments     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  request_date timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted      boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER farmer_requests_updated_at
  BEFORE UPDATE ON farmer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Indexes for Delta Sync ───────────────────────────────────────────────

CREATE INDEX idx_farmers_updated_at      ON farmers(updated_at);
CREATE INDEX idx_employees_updated_at    ON employees(updated_at);
CREATE INDEX idx_products_updated_at     ON products(updated_at);
CREATE INDEX idx_suppliers_updated_at    ON suppliers(updated_at);
CREATE INDEX idx_transactions_updated_at ON transactions(updated_at);
CREATE INDEX idx_farmer_groups_updated_at    ON farmer_groups(updated_at);
CREATE INDEX idx_farmer_requests_updated_at  ON farmer_requests(updated_at);

-- Additional indexes for common queries
CREATE INDEX idx_farmers_region          ON farmers(region);
CREATE INDEX idx_farmers_district        ON farmers(district);
CREATE INDEX idx_products_supplier_id    ON products(supplier_id);
CREATE INDEX idx_farmer_requests_farmer  ON farmer_requests(farmer_id);

-- ─── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees       ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_requests ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read/write all rows
-- (You can tighten these later to per-role access)

CREATE POLICY "Authenticated users can read users"
  ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- For data tables: full CRUD for any authenticated user
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['farmers','employees','suppliers','products','transactions','farmer_groups','farmer_requests'])
  LOOP
    EXECUTE format('CREATE POLICY "Authenticated read %1$s" ON %1$s FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Authenticated insert %1$s" ON %1$s FOR INSERT TO authenticated WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Authenticated update %1$s" ON %1$s FOR UPDATE TO authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Authenticated delete %1$s" ON %1$s FOR DELETE TO authenticated USING (true)', tbl);
  END LOOP;
END $$;
