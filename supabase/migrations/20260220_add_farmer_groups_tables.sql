-- 1. Create Farmer Groups Table
CREATE TABLE farmer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    district TEXT NOT NULL,
    community TEXT,
    leader_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE farmer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON farmer_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON farmer_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON farmer_groups FOR UPDATE TO authenticated USING (true);

-- 2. Add group_id to farmers table (if it doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='farmers' AND column_name='group_id') THEN
        ALTER TABLE farmers ADD COLUMN group_id UUID REFERENCES farmer_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create Product Requests Table
CREATE TABLE product_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    group_id UUID REFERENCES farmer_groups(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_type TEXT NOT NULL,
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE product_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON product_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON product_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON product_requests FOR UPDATE TO authenticated USING (true);

-- 4. Create Farmer Financials (Payments) Table
CREATE TABLE farmer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE farmer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON farmer_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON farmer_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON farmer_payments FOR UPDATE TO authenticated USING (true);

-- 5. Attach Update Triggers
DROP TRIGGER IF EXISTS update_farmer_groups_updated_at ON farmer_groups;
CREATE TRIGGER update_farmer_groups_updated_at BEFORE UPDATE ON farmer_groups FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_requests_updated_at ON product_requests;
CREATE TRIGGER update_product_requests_updated_at BEFORE UPDATE ON product_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_farmer_payments_updated_at ON farmer_payments;
CREATE TRIGGER update_farmer_payments_updated_at BEFORE UPDATE ON farmer_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
