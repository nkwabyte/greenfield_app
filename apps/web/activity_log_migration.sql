-- ============================================================================
-- Greenfield CRM — Activity Log Migration
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- ─── Activity Logs Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   text        NOT NULL,
  user_role   text        NOT NULL,
  action      text        NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text        NOT NULL,  -- 'farmer' | 'employee' | 'product' | 'supplier' | 'transaction' | 'farmer_group' | 'farmer_request'
  entity_id   text        NOT NULL,
  entity_name text        NOT NULL,  -- human-readable label e.g. "Kwame Asante"
  metadata    jsonb,                 -- optional extra context (e.g. { category: 'Income', amount: 500 })
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);

-- ─── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Employees can only read their own logs
CREATE POLICY "Users can read own activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all logs
CREATE POLICY "Admins can read all activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Any authenticated user can insert (scoped to their own user_id by app logic)
CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── Auto-Cleanup Function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- ─── Schedule Daily Cleanup (pg_cron — available on Supabase Pro) ─────────
-- If pg_cron is enabled on your project, run this to schedule daily at 02:00 UTC:
--
-- SELECT cron.schedule(
--   'cleanup-activity-logs-daily',
--   '0 2 * * *',
--   'SELECT cleanup_old_activity_logs()'
-- );
--
-- To verify it's scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-activity-logs-daily';
--
-- On Free tier, the app calls cleanup_old_activity_logs() via a server-side
-- API route once per day instead.

-- ─── Manual test: verify cleanup works ────────────────────────────────────
-- INSERT INTO activity_logs (user_id, user_name, user_role, action, entity_type, entity_id, entity_name, created_at)
-- VALUES (auth.uid(), 'Test User', 'Admin', 'create', 'farmer', 'test-id', 'Test Farmer', now() - INTERVAL '31 days');
-- SELECT cleanup_old_activity_logs();
-- SELECT count(*) FROM activity_logs WHERE entity_id = 'test-id'; -- should be 0
