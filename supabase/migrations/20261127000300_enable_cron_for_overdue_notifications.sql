-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule overdue invoice notifications to run every 6 hours
-- This will send WhatsApp reminders for unpaid invoices at 24hr, 48hr, and 7-day intervals
SELECT cron.schedule(
  'send-overdue-invoice-notifications',
  '0 */6 * * *',  -- Every 6 hours (at :00 minutes)
  $$
  SELECT
    net.http_post(
      url := 'https://mjaobluyatooabghlzdo.supabase.co/functions/v1/send-overdue-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Note: The cron job will start running automatically after this migration
-- Check logs with: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
