-- ============================================================================
-- Management Recommendations Migration
-- Date: 2026-03-17
--
-- 1. Add cocoa_district column to farmers (free-text, separate from political district)
-- 2. Add job_title column to users (stores employee sub-role: Manager, Field Agent, etc.)
-- 3. Add assigned_districts column to employees (text[], for Field Agent district filtering)
-- ============================================================================

-- ── 1. Cocoa District on farmers ────────────────────────────────────────────
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS cocoa_district text;

-- Index for filtering by cocoa district
CREATE INDEX IF NOT EXISTS idx_farmers_cocoa_district ON farmers(cocoa_district);

-- ── 2. Job Title on users ────────────────────────────────────────────────────
-- Stores the employee role (Manager, Field Agent, Accountant, Support) so that
-- the app can enforce fine-grained access control beyond Admin/Employee.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS job_title text;

-- ── 3. Assigned Districts on employees ──────────────────────────────────────
-- Field Agents should only see farmers in their assigned districts.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS assigned_districts text[] DEFAULT '{}';
