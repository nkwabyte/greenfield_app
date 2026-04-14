-- ============================================================================
-- Greenfield CRM — Cocoa Districts Migration
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cocoa_districts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  is_active   boolean     NOT NULL DEFAULT true,
  created_by  text,                    -- UID or name of the admin who created it
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted     boolean     NOT NULL DEFAULT false
);

-- ─── Auto-update trigger ─────────────────────────────────────────────────────

CREATE TRIGGER cocoa_districts_updated_at
  BEFORE UPDATE ON cocoa_districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Indexes for delta sync ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cocoa_districts_updated_at ON cocoa_districts(updated_at);
CREATE INDEX IF NOT EXISTS idx_cocoa_districts_is_active  ON cocoa_districts(is_active);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE cocoa_districts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read approved districts (needed for the farmer form)
CREATE POLICY "Authenticated read cocoa_districts"
  ON cocoa_districts FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert, update, and delete
-- (You can tighten this later to Admin/Manager only using auth.jwt())
CREATE POLICY "Authenticated insert cocoa_districts"
  ON cocoa_districts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update cocoa_districts"
  ON cocoa_districts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated delete cocoa_districts"
  ON cocoa_districts FOR DELETE
  TO authenticated
  USING (true);
