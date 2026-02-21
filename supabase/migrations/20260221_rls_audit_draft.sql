-- Greenfield CRM Row Level Security — Final Policy Set
-- Applied: 2026-02-21
--
-- Rules:
--   • All authenticated users have full CRUD on data tables (farmers, groups, requests, products, suppliers, transactions)
--   • EMPLOYEES table: all authenticated can SELECT/INSERT/UPDATE; DELETE restricted to Managers
--   • ACTIVITY_LOG: append-only — INSERT (own rows) + SELECT only; no UPDATE or DELETE by anyone

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE farmers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: is_manager()
-- ============================================================
CREATE OR REPLACE FUNCTION is_manager() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE id = auth.uid()::text
    AND role = 'Manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FARMERS — full CRUD for all authenticated users
-- ============================================================
CREATE POLICY "farmers: all authenticated can SELECT" ON farmers FOR SELECT TO authenticated USING (true);
CREATE POLICY "farmers: all authenticated can INSERT" ON farmers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "farmers: all authenticated can UPDATE" ON farmers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "farmers: all authenticated can DELETE" ON farmers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- FARMER GROUPS — full CRUD for all authenticated users
-- ============================================================
CREATE POLICY "farmer_groups: all authenticated can SELECT" ON farmer_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "farmer_groups: all authenticated can INSERT" ON farmer_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "farmer_groups: all authenticated can UPDATE" ON farmer_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "farmer_groups: all authenticated can DELETE" ON farmer_groups FOR DELETE TO authenticated USING (true);

-- ============================================================
-- FARMER REQUESTS — full CRUD for all authenticated users
-- ============================================================
CREATE POLICY "farmer_requests: all authenticated can SELECT" ON farmer_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "farmer_requests: all authenticated can INSERT" ON farmer_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "farmer_requests: all authenticated can UPDATE" ON farmer_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "farmer_requests: all authenticated can DELETE" ON farmer_requests FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PRODUCTS — full CRUD for all authenticated users
-- ============================================================
CREATE POLICY "products: all authenticated can SELECT" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products: all authenticated can INSERT" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products: all authenticated can UPDATE" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "products: all authenticated can DELETE" ON products FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SUPPLIERS — full CRUD for all authenticated users
-- ============================================================
CREATE POLICY "suppliers: all authenticated can SELECT" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers: all authenticated can INSERT" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "suppliers: all authenticated can UPDATE" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "suppliers: all authenticated can DELETE" ON suppliers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRANSACTIONS — full CRUD for all authenticated users
-- ============================================================
CREATE POLICY "transactions: all authenticated can SELECT" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions: all authenticated can INSERT" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions: all authenticated can UPDATE" ON transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transactions: all authenticated can DELETE" ON transactions FOR DELETE TO authenticated USING (true);

-- ============================================================
-- EMPLOYEES — SELECT/INSERT/UPDATE for all authenticated; DELETE for managers only
-- ============================================================
CREATE POLICY "employees: all authenticated can SELECT" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees: all authenticated can INSERT" ON employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employees: all authenticated can UPDATE" ON employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "employees: only managers can DELETE" ON employees FOR DELETE TO authenticated USING (is_manager());

-- ============================================================
-- ACTIVITY LOG — append-only (INSERT + SELECT only; no UPDATE or DELETE)
-- ============================================================
CREATE POLICY "activity_log: all authenticated can SELECT" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_log: users can INSERT their own logs" ON activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
