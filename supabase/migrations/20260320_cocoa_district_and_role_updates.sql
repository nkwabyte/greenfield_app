-- ============================================================
-- Migration: cocoa_district on farmer_groups + role data updates
-- Date: 2026-03-20
-- ============================================================

-- 1. Add cocoa_district column to farmer_groups
ALTER TABLE farmer_groups
  ADD COLUMN IF NOT EXISTS cocoa_district TEXT;

CREATE INDEX IF NOT EXISTS idx_groups_cocoa_district
  ON farmer_groups(cocoa_district);

-- 2. Update employees.role from old values to new values
UPDATE employees SET role = 'General Manager'      WHERE role = 'Manager';
UPDATE employees SET role = 'Finance Manager'      WHERE role = 'Accountant';
UPDATE employees SET role = 'Administrative Member' WHERE role = 'Support';

-- 3. Update users.job_title from old values to new values
UPDATE users SET job_title = 'General Manager'      WHERE job_title = 'Manager';
UPDATE users SET job_title = 'Finance Manager'      WHERE job_title = 'Accountant';
UPDATE users SET job_title = 'Administrative Member' WHERE job_title = 'Support';
