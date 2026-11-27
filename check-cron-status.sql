-- Check if cron job is scheduled
SELECT * FROM cron.job;

-- Check recent cron job runs (last 10)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Manually trigger the overdue notifications function now (for testing)
-- Uncomment the line below to run immediately:
-- SELECT net.http_post(url := 'https://mjaobluyatooabghlzdo.supabase.co/functions/v1/send-overdue-notifications', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);
